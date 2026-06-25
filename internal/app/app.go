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
	Kind       string `json:"kind"` // success / already_done / not_found / transient / fatal / canceled
	Code       int    `json:"code"`
	Error      string `json:"error,omitempty"`
	DurationMs int64  `json:"durationMs"`
}

type ApplyResult struct {
	OpID     string       `json:"opId"`
	Ok       bool         `json:"ok"`
	Partial  bool         `json:"partial"`  // a write may have landed before a failure
	Canceled bool         `json:"canceled"` // the run was canceled
	Steps    []StepResult `json:"steps"`    // always non-nil
	Error    string       `json:"error,omitempty"`
	Warnings []string     `json:"warnings,omitempty"`
}

// ---- API: the bound Wails surface ----

// API is the ONLY object bound across the bridge. It exposes exactly the
// application methods; lifecycle wiring lives on App (which is not bound), so
// Wails does not expose Startup/SetEmitter to JavaScript.
type API struct{ app *App }

func NewAPI(app *App) *API { return &API{app: app} }

func (a *API) DoExample(req ExampleRequest) ExampleResult { return a.app.DoExample(req) }

func (a *API) ApplyExample(req ExampleRequest, opID string) ApplyResult {
	return a.app.ApplyExample(req, opID)
}

func (a *API) CancelOperation(id string) bool { return a.app.CancelOperation(id) }

// ---- App: implementation + lifecycle (not bound) ----

type App struct {
	ctx      context.Context
	log      *slog.Logger
	runner   adapter.Runner
	registry *ops.Registry
	emitter  ops.Emitter
}

// NewApp wires the production runner stack. Order matters: RetryRunner wraps
// LoggingRunner wraps ExecRunner, so EVERY attempt is logged (middleware A),
// not just the final one.
func NewApp() *App {
	log := logging.New()
	exec := adapter.ExecRunner{
		Binary:   "example-tool",
		Env:      []string{"LANG=en_US.UTF-8"},
		Classify: classifyExampleTool,
		Default:  20 * time.Second,
		OnStart:  platform.ConfigureHiddenCommandWindow,
	}
	runner := adapter.RetryRunner{
		Inner:   adapter.LoggingRunner{Inner: exec, Log: log},
		Max:     3,
		Backoff: adapter.ExponentialBackoff(200 * time.Millisecond),
	}
	a := NewAppWithRunner(runner)
	a.log = log
	return a
}

// NewAppWithRunner injects the Runner (DI seam) so handlers can be unit-tested
// with adapter.FakeRunner — no Wails, no real external tool.
func NewAppWithRunner(runner adapter.Runner) *App {
	return &App{
		log:      logging.New(),
		runner:   runner,
		registry: ops.NewRegistry(),
		emitter:  ops.NopEmitter{},
	}
}

// Startup stores the Wails context (called from OnStartup; not bound).
func (a *App) Startup(ctx context.Context) { a.ctx = ctx }

// SetEmitter installs the progress emitter (wired in main at startup; not bound).
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
// progress and returning per-step typed results (E). The opID is supplied by the
// client so progress events can be filtered to this exact operation.
func (a *App) ApplyExample(req ExampleRequest, opID string) ApplyResult {
	out := ApplyResult{Steps: []StepResult{}} // never nil → never crashes the UI .map()

	norm, warnings, err := domain.NormalizeExample(domain.ExampleRequest(req))
	out.Warnings = warnings
	if err != nil {
		out.Error = err.Error()
		return out
	}

	if strings.TrimSpace(opID) == "" {
		opID = defaultOpID() // resilience: synthesize one if the client didn't supply it
	}
	out.OpID = opID
	ctx, release := a.registry.Begin(a.ctxOrBackground(), opID)
	defer release()

	plan := exampleApplyPlan(norm)
	red := logging.NewRedactor(norm.Secret)
	outcomes := plan.ExecuteWithProgress(ctx, a.runner, a.emitter, opID)

	out.Steps = make([]StepResult, 0, len(outcomes))
	for _, o := range outcomes {
		sr := StepResult{
			Name:       o.Step.Command.Name,
			Kind:       o.Result.Kind.String(),
			Code:       o.Result.Code,
			DurationMs: o.Result.DurationMs,
		}
		if !o.Accepted {
			sr.Error = red.Redact(o.Result.Message)
		}
		out.Steps = append(out.Steps, sr)
	}

	out.Ok = domain.Succeeded(outcomes)
	out.Partial = !out.Ok && domain.PartiallyApplied(outcomes) // partial only matters on failure
	out.Canceled = domain.Canceled(outcomes)
	if !out.Ok && len(outcomes) > 0 {
		out.Error = red.Redact(outcomes[len(outcomes)-1].Result.Message)
	}
	return out
}

// exampleApplyPlan is the representative multi-step plan: read → write → idempotent
// write → verify. Only reads/verifies are Retryable; writes are not (a timeout
// after a side effect must not be replayed).
func exampleApplyPlan(n domain.NormalizedExample) domain.Plan {
	secret := []byte(n.Secret)
	return domain.Plan{Steps: []domain.Step{
		{Effect: domain.EffectRead, Command: adapter.Command{ID: "detect", Name: "detect", Args: n.Args(), Retryable: true}},
		{Effect: domain.EffectWrite, Command: adapter.Command{ID: "configure", Name: "configure", Args: n.Args(), Stdin: secret}},
		{Effect: domain.EffectWrite, AllowAlreadyDone: true, Command: adapter.Command{ID: "enable", Name: "enable", Args: n.Args()}},
		{Effect: domain.EffectVerify, Command: adapter.Command{ID: "verify", Name: "verify", Args: n.Args(), Retryable: true}},
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
