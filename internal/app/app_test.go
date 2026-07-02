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

// ---- safe-write loop: PlanExample preflight + ApplyExample read-back ----

func TestPlanExampleBuildsWhitelistedDiff(t *testing.T) {
	fake := &adapter.FakeRunner{Responses: map[string]adapter.Result{
		"detect": {Kind: adapter.KindSuccess, Raw: "host=old\nport=80\nmode=auto"},
	}}
	pf := newTestApp(fake).PlanExample(ExampleRequest{Host: "new", Port: 443, Secret: "s"})
	if pf.Error != "" {
		t.Fatalf("unexpected error: %q", pf.Error)
	}
	if !pf.CanWrite || !pf.HasWriteDiff {
		t.Fatalf("expected a writable pending preflight, got %+v", pf.Preflight)
	}
	if len(pf.Diff) != 2 { // host old→new, port 80→443; mode unchanged
		t.Fatalf("expected 2 diff entries, got %+v", pf.Diff)
	}
	for _, e := range pf.Diff {
		if !e.Allowed {
			t.Fatalf("expected only whitelisted changes, got %+v", e)
		}
	}
}

func TestPlanExampleNoDiffWhenAlreadyConsistent(t *testing.T) {
	fake := &adapter.FakeRunner{Responses: map[string]adapter.Result{
		"detect": {Kind: adapter.KindSuccess, Raw: "host=h\nport=443"},
	}}
	pf := newTestApp(fake).PlanExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"})
	if pf.HasWriteDiff || !pf.CanWrite {
		t.Fatalf("expected no-diff preflight, got %+v", pf.Preflight)
	}
}

func TestPlanExampleSurfacesReadFailure(t *testing.T) {
	fake := &adapter.FakeRunner{Responses: map[string]adapter.Result{
		"detect": {Kind: adapter.KindFatal, Message: "connection refused"},
	}}
	pf := newTestApp(fake).PlanExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"})
	if pf.Error == "" {
		t.Fatal("expected the read failure to surface as an error")
	}
}

func TestApplyExampleReadbackMismatchFails(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect": {Kind: adapter.KindSuccess, Raw: "host=old\nport=80"},
			// The write "succeeded" but the verify read-back shows port didn't take.
			"verify": {Kind: adapter.KindSuccess, Raw: "host=h\nport=80"},
		},
		Default: adapter.Result{Kind: adapter.KindSuccess},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	if res.Ok {
		t.Fatal("expected the read-back mismatch to fail the apply")
	}
	if !strings.Contains(res.Error, "port") {
		t.Fatalf("expected the error to name the mismatched field, got %q", res.Error)
	}
}

func TestApplyExampleReadbackUnexpectedFieldFails(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect": {Kind: adapter.KindSuccess, Raw: "host=old\nport=80\nmode=auto"},
			// host/port landed, but a non-whitelisted field changed too.
			"verify": {Kind: adapter.KindSuccess, Raw: "host=h\nport=443\nmode=manual"},
		},
		Default: adapter.Result{Kind: adapter.KindSuccess},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	if res.Ok || !strings.Contains(res.Error, "mode") {
		t.Fatalf("expected an unexpected-field failure naming mode, got ok=%v err=%q", res.Ok, res.Error)
	}
}

func TestApplyExampleReadbackOkPopulatesReadback(t *testing.T) {
	fake := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"detect": {Kind: adapter.KindSuccess, Raw: "host=old\nport=80\nmode=auto"},
			"verify": {Kind: adapter.KindSuccess, Raw: "host=h\nport=443\nmode=auto"},
		},
		Default: adapter.Result{Kind: adapter.KindSuccess},
	}
	res := newTestApp(fake).ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	if !res.Ok {
		t.Fatalf("expected success, got %+v", res)
	}
	if res.Readback["host"] != "h" || res.Readback["port"] != "443" {
		t.Fatalf("expected read-back values, got %+v", res.Readback)
	}
}

func TestApplyExampleNoVerifyOutputSkipsReadback(t *testing.T) {
	// Steps succeed but the verify step prints nothing parseable: the apply stays
	// ok (nothing to compare) and Readback stays empty — the pre-diff behavior.
	a := newTestApp(&adapter.FakeRunner{Default: adapter.Result{Kind: adapter.KindSuccess}})
	res := a.ApplyExample(ExampleRequest{Host: "h", Port: 443, Secret: "s"}, "op-1")
	if !res.Ok || len(res.Readback) != 0 {
		t.Fatalf("expected ok with no read-back, got %+v", res)
	}
}
