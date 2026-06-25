package adapter

import (
	"context"
	"log/slog"
	"time"
)

// LoggingRunner logs metadata for every command + classified result, so the
// observability rule is enforced structurally rather than remembered in each
// handler. It deliberately logs no raw output or message (which may contain
// secrets); handlers log request-scoped, redacted messages.
//
// Wrap the EXEC runner with this, then wrap THAT with RetryRunner, so every
// attempt is logged (not just the final one).
type LoggingRunner struct {
	Inner Runner
	Log   *slog.Logger
}

func (l LoggingRunner) Run(ctx context.Context, cmd Command) Result {
	res := l.Inner.Run(ctx, cmd)
	if l.Log != nil {
		level := slog.LevelInfo
		if !res.OK() {
			level = slog.LevelWarn
		}
		l.Log.Log(ctx, level, "adapter.run",
			"command", cmd.Name,
			"id", cmd.ID,
			"kind", res.Kind.String(),
			"code", res.Code,
			"duration_ms", res.DurationMs,
		)
	}
	return res
}

// RetryRunner retries the inner runner on transient failures, but ONLY for
// commands explicitly marked Retryable (reads/idempotent ops). Writes default to
// Retryable=false, so a timeout that occurs after the external tool already
// applied a side effect is never blindly replayed. It honors context
// cancellation and surfaces it as KindCanceled rather than the prior result.
type RetryRunner struct {
	Inner   Runner
	Max     int                             // max attempts; <1 is treated as 1
	Backoff func(attempt int) time.Duration // nil = no delay between attempts
}

func (r RetryRunner) Run(ctx context.Context, cmd Command) Result {
	max := r.Max
	if max < 1 {
		max = 1
	}
	var res Result
	for attempt := 1; attempt <= max; attempt++ {
		if ctx.Err() != nil {
			return Result{Kind: KindCanceled, Message: cmd.Name + " canceled"}
		}
		res = r.Inner.Run(ctx, cmd)
		if !cmd.Retryable || res.Kind != KindTransient || attempt == max {
			return res
		}
		if r.Backoff == nil {
			continue
		}
		if delay := r.Backoff(attempt); delay > 0 {
			timer := time.NewTimer(delay)
			select {
			case <-ctx.Done():
				timer.Stop()
				return Result{Kind: KindCanceled, Message: cmd.Name + " canceled"}
			case <-timer.C:
			}
		}
	}
	return res
}

// ExponentialBackoff returns a backoff of base * 2^(attempt-1).
func ExponentialBackoff(base time.Duration) func(attempt int) time.Duration {
	return func(attempt int) time.Duration {
		d := base
		for i := 1; i < attempt; i++ {
			d *= 2
		}
		return d
	}
}
