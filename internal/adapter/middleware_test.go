package adapter

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"
)

func TestRetryRunnerRetriesTransientThenSucceeds(t *testing.T) {
	attempts := 0
	inner := RunnerFunc(func(_ context.Context, _ Command) Result {
		attempts++
		if attempts < 3 {
			return Result{Kind: KindTransient}
		}
		return Result{Kind: KindSuccess}
	})
	r := RetryRunner{Inner: inner, Max: 5, Backoff: func(int) time.Duration { return 0 }}

	res := r.Run(context.Background(), Command{})
	if !res.OK() {
		t.Fatalf("expected success after retries, got %v", res.Kind)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
}

func TestRetryRunnerGivesUpAfterMax(t *testing.T) {
	attempts := 0
	inner := RunnerFunc(func(_ context.Context, _ Command) Result {
		attempts++
		return Result{Kind: KindTransient}
	})
	r := RetryRunner{Inner: inner, Max: 3, Backoff: func(int) time.Duration { return 0 }}

	res := r.Run(context.Background(), Command{})
	if res.Kind != KindTransient {
		t.Fatalf("expected transient after giving up, got %v", res.Kind)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
}

func TestRetryRunnerStopsOnContextCancel(t *testing.T) {
	attempts := 0
	inner := RunnerFunc(func(_ context.Context, _ Command) Result {
		attempts++
		return Result{Kind: KindTransient}
	})
	r := RetryRunner{Inner: inner, Max: 5, Backoff: func(int) time.Duration { return 50 * time.Millisecond }}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // already cancelled: the first backoff must abort
	r.Run(ctx, Command{})
	if attempts != 1 {
		t.Fatalf("expected 1 attempt on a cancelled context, got %d", attempts)
	}
}

func TestLoggingRunnerPassesThroughAndLogs(t *testing.T) {
	inner := RunnerFunc(func(_ context.Context, _ Command) Result {
		return Result{Kind: KindSuccess}
	})
	var buf bytes.Buffer
	r := LoggingRunner{Inner: inner, Log: slog.New(slog.NewTextHandler(&buf, nil))}

	res := r.Run(context.Background(), Command{Name: "do-x"})
	if !res.OK() {
		t.Fatal("expected passthrough success")
	}
	if !strings.Contains(buf.String(), "adapter.run") || !strings.Contains(buf.String(), "do-x") {
		t.Fatalf("expected a log line for the command, got %q", buf.String())
	}
}
