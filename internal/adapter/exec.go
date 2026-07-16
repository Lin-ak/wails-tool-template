package adapter

import (
	"bytes"
	"context"
	"errors"
	"os"
	"os/exec"
	"time"
)

// ExecRunner runs a real binary. Construct it once (it is safe to share) with a
// Classifier that understands the binary's output.
type ExecRunner struct {
	Binary   string          // path or name of the external binary
	Env      []string        // extra env, e.g. {"LANG=en_US.UTF-8"} for stable parsing
	Classify Classifier      // system-specific output dialect (required)
	Default  time.Duration   // fallback per-command timeout
	OnStart  func(*exec.Cmd) // platform hook, e.g. hide the console window on Windows
}

// Run executes one Command with timeout + cancellation and returns a classified
// Result. A deadline is reported as KindTransient (retryable) before the
// Classifier sees it, so timeouts never get misread as fatal.
func (r ExecRunner) Run(ctx context.Context, cmd Command) Result {
	if ctx.Err() != nil {
		return Result{Kind: KindCanceled, Message: cmd.Name + " canceled"}
	}
	timeout := cmd.Timeout
	if timeout <= 0 {
		timeout = r.Default
	}
	// No Default configured means no per-command deadline. Guard it explicitly:
	// WithTimeout(ctx, 0) would be an ALREADY-EXPIRED context, turning every
	// command into an instant (and retried) "timed out".
	runCtx, cancel := ctx, func() {}
	if timeout > 0 {
		runCtx, cancel = context.WithTimeout(ctx, timeout)
	}
	defer cancel()

	var stdout, stderr bytes.Buffer
	c := exec.CommandContext(runCtx, r.Binary, cmd.Args...)
	c.Stdout, c.Stderr = &stdout, &stderr
	if len(cmd.Stdin) > 0 {
		c.Stdin = bytes.NewReader(cmd.Stdin)
	}
	if len(r.Env) > 0 {
		c.Env = append(os.Environ(), r.Env...)
	}
	if r.OnStart != nil {
		r.OnStart(c)
	}

	start := time.Now()
	err := c.Run()
	dur := time.Since(start).Milliseconds()

	// Distinguish caller cancellation (KindCanceled) from a per-command timeout
	// (KindTransient) before handing off to the external-output classifier.
	switch {
	case ctx.Err() == context.Canceled:
		return Result{Kind: KindCanceled, Message: cmd.Name + " canceled", DurationMs: dur}
	case runCtx.Err() == context.DeadlineExceeded:
		return Result{Kind: KindTransient, Message: cmd.Name + " timed out", DurationMs: dur}
	}
	kind, code, msg := r.Classify(stdout.String(), stderr.String(), exitCode(err), err)
	return Result{Kind: kind, Code: code, Message: msg, Raw: stdout.String(), DurationMs: dur}
}

func exitCode(err error) int {
	if err == nil {
		return 0
	}
	var ee *exec.ExitError
	if errors.As(err, &ee) {
		return ee.ExitCode()
	}
	return -1
}
