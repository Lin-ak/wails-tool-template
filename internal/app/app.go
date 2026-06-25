// Package app holds the application layer — the handlers bound across the Wails
// bridge. It imports no Wails packages, so handlers are fully unit-testable with
// a fake Runner. package main is only the Wails bootstrap + progress emitter.
package app

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync/atomic"
	"time"

	"wails-tool-template/internal/adapter"
	"wails-tool-template/internal/domain"
	"wails-tool-template/internal/logging"
	"wails-tool-template/internal/ops"
	"wails-tool-template/internal/platform"
)

// ---- types crossing the Wails bridge (Wails generates matching TS) ----

type ExampleRequest struct {
	Host   string `json:"host"`
	Port   int    `json:"port"`
	Secret string `json:"secret"`
}

type ExampleResult struct {
	Ok       bool     `json:"ok"`
	Kind     string   `json:"kind,omitempty"` // surfaced taxonomy, so the UI can branch
	Output   string   `json:"output"`
	Error    string   `json:"error,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

type StepResult struct {
	Name       string `json:"name"`
	Kind       string `json:"kind"` // success / not_found / transient / fatal / ...
	Code       int    `json:"code"`
	Error      string `json:"error,omitempty"`
	DurationMs int64  `json:"durationMs"`
}

type ApplyResult struct {
	OpID     string       `json:"opId"`
	Ok       bool         `json:"ok"`
	Partial  bool         `json:"partial"` // some steps committed before a failure
	Steps    []StepResult `json:"steps"`
	Error    string       `json:"error,omitempty"`
	Warnings []string     `json:"warnings,omitempty"`
}

// ---- App ----

type App struct {
	ctx      context.Context
	log      *slog.Logger
	runner   adapter.Runner
	registry *ops.Registry
	emitter  ops.Emitter
	newOpID  func() string
}

// NewApp wires the production runner stack: ExecRunner, retried on transient
// failures, with every call logged (middleware A).
func NewApp() *App {
	log := logging.New()
	exec := adapter.ExecRunner{
		Binary:   "example-tool",
		Env:      []string{"LANG=en_US.UTF-8"},
		Classify: classifyExampleTool,
		Default:  20 * time.Second,
		OnStart:  platform.ConfigureHiddenCommandWindow,
	}
	runner := adapter.LoggingRunner{
		Inner: adapter.RetryRunner{
			Inner:   exec,
			Max:     3,
			Backoff: adapter.ExponentialBackoff(200 * time.Millisecond),
		},
		Log: log,
	}
	a := NewAppWithRunner(runner)
	a.log = log
	return a
}

// NewAppWithRunner injects the Runner (DI seam) so handlers can be unit-tested
// with adapter.FakeRunner — no Wails, no real external tool (E).
func NewAppWithRunner(runner adapter.Runner) *App {
	return &App{
		log:      logging.New(),
		runner:   runner,
		registry: ops.NewRegistry(),
		emitter:  ops.NopEmitter{},
		newOpID:  defaultOpID,
	}
}

// Startup stores the Wails context (called from OnStartup).
func (a *App) Startup(ctx context.Context) { a.ctx = ctx }

// SetEmitter installs the progress emitter (the Wails implementation is wired in
// main at startup).
func (a *App) SetEmitter(e ops.Emitter) {
	if e != nil {
		a.emitter = e
	}
}

// CancelOperation cancels an in-flight ApplyExample by id; false if not running.
func (a *App) CancelOperation(id string) bool { return a.registry.Cancel(id) }

func (a *App) ctxOrBackground() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
}

// DoExample is a single-command handler: normalize → run → redact. The secret
// travels via stdin (C), never argv.
func (a *App) DoExample(req ExampleRequest) ExampleResult {
	norm, warnings, err := domain.NormalizeExample(domain.ExampleRequest(req))
	if err != nil {
		return ExampleResult{Error: err.Error()}
	}
	red := logging.NewRedactor(norm.Secret)
	res := a.runner.Run(a.ctxOrBackground(), adapter.Command{
		ID: "example", Name: "do-example", Args: norm.Args(), Stdin: []byte(norm.Secret),
	})
	out := ExampleResult{Ok: res.OK(), Kind: res.Kind.String(), Output: red.Redact(res.Raw), Warnings: warnings}
	if !res.OK() {
		out.Error = red.Redact(res.Message)
	}
	return out
}

// ApplyExample runs a multi-step plan over a cancellable operation (B), streaming
// progress and returning per-step typed results (E). Built via NewApp, transient
// steps are retried and every call logged by the runner middleware (A).
func (a *App) ApplyExample(req ExampleRequest) ApplyResult {
	norm, warnings, err := domain.NormalizeExample(domain.ExampleRequest(req))
	if err != nil {
		return ApplyResult{Error: err.Error()}
	}

	opID := a.newOpID()
	ctx, release := a.registry.Begin(a.ctxOrBackground(), opID)
	defer release()

	plan := exampleApplyPlan(norm)
	red := logging.NewRedactor(norm.Secret)
	results := plan.ExecuteWithProgress(ctx, a.runner, a.emitter, opID)

	out := ApplyResult{OpID: opID, Warnings: warnings, Steps: make([]StepResult, 0, len(results))}
	for i, r := range results {
		step := StepResult{
			Name:       plan.Steps[i].Command.Name,
			Kind:       r.Kind.String(),
			Code:       r.Code,
			DurationMs: r.DurationMs,
		}
		if !r.OK() {
			step.Error = red.Redact(r.Message)
		}
		out.Steps = append(out.Steps, step)
	}

	failed := len(results) == 0 || !results[len(results)-1].OK()
	out.Ok = !failed
	if failed {
		out.Partial = domain.Committed(results)
		if len(results) > 0 {
			out.Error = red.Redact(results[len(results)-1].Message)
		}
	}
	return out
}

// exampleApplyPlan is the representative multi-step plan: detect → configure →
// idempotent enable → verify. Replace the steps with the real operation.
func exampleApplyPlan(n domain.NormalizedExample) domain.Plan {
	secret := []byte(n.Secret)
	return domain.Plan{Steps: []domain.Step{
		{Command: adapter.Command{ID: "detect", Name: "detect", Args: n.Args()}},
		{Command: adapter.Command{ID: "configure", Name: "configure", Args: n.Args(), Stdin: secret}},
		{Command: adapter.Command{ID: "enable", Name: "enable", Args: n.Args()}, AllowAlreadyDone: true},
		{Command: adapter.Command{ID: "verify", Name: "verify", Args: n.Args()}},
	}}
}

// classifyExampleTool is the ONLY place that knows the external tool's output
// dialect. Replace with the real tool's conventions, or delete it when the
// boundary is a typed RPC client.
func classifyExampleTool(_, stderr string, exitCode int, err error) (adapter.Kind, int, string) {
	lower := strings.ToLower(stderr)
	switch {
	case err == nil:
		return adapter.KindSuccess, 0, ""
	case strings.Contains(lower, "already"):
		return adapter.KindAlreadyDone, exitCode, ""
	case strings.Contains(lower, "temporarily") || strings.Contains(lower, "timeout"):
		return adapter.KindTransient, exitCode, strings.TrimSpace(stderr)
	case strings.Contains(lower, "not found"):
		return adapter.KindNotFound, exitCode, "object not found"
	default:
		msg := strings.TrimSpace(stderr)
		if msg == "" {
			msg = err.Error()
		}
		return adapter.KindFatal, exitCode, msg
	}
}

var opSeq atomic.Uint64

func defaultOpID() string {
	return fmt.Sprintf("op-%d-%d", time.Now().UnixNano(), opSeq.Add(1))
}
