package app

import (
	"context"
	"strings"
	"testing"

	"wails-tool-template/internal/adapter"
)

func newTestApp(runner adapter.Runner) *App {
	a := NewAppWithRunner(runner)
	a.Startup(context.Background())
	return a
}

func TestDoExampleValidationError(t *testing.T) {
	a := newTestApp(&adapter.FakeRunner{Default: adapter.Result{Kind: adapter.KindSuccess}})
	if res := a.DoExample(ExampleRequest{Host: "", Port: 443}); res.Error == "" {
		t.Fatal("expected a validation error for empty host")
	}
}

func TestDoExampleSurfacesKind(t *testing.T) {
	a := newTestApp(&adapter.FakeRunner{Default: adapter.Result{Kind: adapter.KindSuccess, Raw: "ok"}})
	res := a.DoExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"})
	if !res.Ok || res.Kind != "success" {
		t.Fatalf("expected ok/success, got %+v", res)
	}
}

func TestApplyExampleAllStepsSucceed(t *testing.T) {
	a := newTestApp(&adapter.FakeRunner{Default: adapter.Result{Kind: adapter.KindSuccess}})
	res := a.ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"})
	if !res.Ok || res.Partial {
		t.Fatalf("expected ok and not partial, got %+v", res)
	}
	if len(res.Steps) != 4 {
		t.Fatalf("expected 4 steps, got %d", len(res.Steps))
	}
}

func TestApplyExamplePartialFailure(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect":    {Kind: adapter.KindSuccess},
			"configure": {Kind: adapter.KindFatal, Message: "permission denied"},
		},
		Default: adapter.Result{Kind: adapter.KindSuccess},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"})
	if res.Ok {
		t.Fatal("expected failure")
	}
	if !res.Partial {
		t.Fatal("expected partial (detect committed before configure failed)")
	}
	if len(res.Steps) != 2 || res.Steps[1].Kind != "fatal" {
		t.Fatalf("expected 2 steps ending fatal, got %+v", res.Steps)
	}
}

func TestApplyExampleRedactsSecretInError(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect": {Kind: adapter.KindFatal, Message: "auth failed for hunter2"},
		},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "hunter2"})
	if strings.Contains(res.Error, "hunter2") || strings.Contains(res.Steps[0].Error, "hunter2") {
		t.Fatalf("expected the secret to be redacted, got error=%q step=%q", res.Error, res.Steps[0].Error)
	}
}

func TestCancelUnknownOperation(t *testing.T) {
	a := newTestApp(&adapter.FakeRunner{Default: adapter.Result{Kind: adapter.KindSuccess}})
	if a.CancelOperation("nope") {
		t.Fatal("expected false for an unknown operation id")
	}
}

func TestCancelOperationStopsInFlightPlan(t *testing.T) {
	started := make(chan struct{})
	blocking := adapter.RunnerFunc(func(ctx context.Context, cmd adapter.Command) adapter.Result {
		if cmd.ID == "detect" {
			close(started)
			<-ctx.Done() // block until cancelled
			return adapter.Result{Kind: adapter.KindTransient, Message: "cancelled"}
		}
		return adapter.Result{Kind: adapter.KindSuccess}
	})
	a := newTestApp(blocking)
	a.newOpID = func() string { return "op-1" }

	done := make(chan ApplyResult, 1)
	go func() { done <- a.ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}) }()

	<-started // the op is now registered and running
	if !a.CancelOperation("op-1") {
		t.Fatal("expected to cancel the in-flight operation")
	}
	if res := <-done; res.Ok {
		t.Fatal("expected a cancelled operation to fail")
	}
}
