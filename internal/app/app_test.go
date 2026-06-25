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
	if res := a.DoExample(ExampleRequest{Host: "", Port: 443, Secret: "s"}); res.Error == "" {
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
	res := a.ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-all")
	if !res.Ok || res.Partial || res.Canceled {
		t.Fatalf("expected ok and not partial/canceled, got %+v", res)
	}
	if len(res.Steps) != 4 {
		t.Fatalf("expected 4 steps, got %d", len(res.Steps))
	}
	if res.OpID != "op-all" {
		t.Fatalf("expected the client-supplied opID, got %q", res.OpID)
	}
}

// A read (detect) succeeding then a write (configure) failing fatally is NOT
// partial — nothing was committed. (The old test asserted the opposite.)
func TestApplyExampleReadThenFatalWriteIsNotPartial(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect":    {Kind: adapter.KindSuccess},
			"configure": {Kind: adapter.KindFatal, Message: "permission denied"},
		},
		Default: adapter.Result{Kind: adapter.KindSuccess},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	if res.Ok {
		t.Fatal("expected failure")
	}
	if res.Partial {
		t.Fatal("expected NOT partial: detect is a read, and the failed write never committed")
	}
	if len(res.Steps) != 2 || res.Steps[1].Kind != "fatal" {
		t.Fatalf("expected 2 steps ending fatal, got %+v", res.Steps)
	}
}

// A committed write followed by a later failure IS partial.
func TestApplyExampleCommittedWriteIsPartial(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect":    {Kind: adapter.KindSuccess},
			"configure": {Kind: adapter.KindSuccess},
			"enable":    {Kind: adapter.KindFatal, Message: "boom"},
		},
		Default: adapter.Result{Kind: adapter.KindSuccess},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	if res.Ok || !res.Partial {
		t.Fatalf("expected failed + partial (configure write committed), got %+v", res)
	}
}

// A write that times out is uncertain → partial (it may have landed remotely).
func TestApplyExampleWriteTimeoutIsPartial(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect":    {Kind: adapter.KindSuccess},
			"configure": {Kind: adapter.KindTransient, Message: "configure timed out"},
		},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	if res.Ok || !res.Partial {
		t.Fatalf("expected failed + partial for an uncertain write, got %+v", res)
	}
}

func TestApplyExampleRedactsSecretInError(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect": {Kind: adapter.KindFatal, Message: "auth failed for hunter2"},
		},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "hunter2"}, "op-1")
	if strings.Contains(res.Error, "hunter2") || strings.Contains(res.Steps[0].Error, "hunter2") {
		t.Fatalf("expected the secret to be redacted, got error=%q step=%q", res.Error, res.Steps[0].Error)
	}
}

func TestApplyExampleStepsNeverNil(t *testing.T) {
	a := newTestApp(&adapter.FakeRunner{Default: adapter.Result{Kind: adapter.KindSuccess}})
	res := a.ApplyExample(ExampleRequest{Host: "", Port: 443, Secret: "s"}, "op-1") // validation error path
	if res.Steps == nil {
		t.Fatal("Steps must be a non-nil slice on every path (else JSON null crashes the UI)")
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
			return adapter.Result{Kind: adapter.KindCanceled, Message: "canceled"}
		}
		return adapter.Result{Kind: adapter.KindSuccess}
	})
	a := newTestApp(blocking)

	done := make(chan ApplyResult, 1)
	go func() {
		done <- a.ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	}()

	<-started // the op is now registered under "op-1" and running
	if !a.CancelOperation("op-1") {
		t.Fatal("expected to cancel the in-flight operation")
	}
	res := <-done
	if res.Ok || !res.Canceled {
		t.Fatalf("expected a canceled (not ok) result, got %+v", res)
	}
}

func TestAPIDelegatesToApp(t *testing.T) {
	api := NewAPI(newTestApp(&adapter.FakeRunner{Default: adapter.Result{Kind: adapter.KindSuccess}}))
	if res := api.ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1"); !res.Ok {
		t.Fatalf("expected API.ApplyExample to delegate and succeed, got %+v", res)
	}
}
