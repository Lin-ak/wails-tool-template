package domain

import (
	"context"
	"testing"

	"wails-tool-template/internal/adapter"
)

func TestPlanStopsAtFirstFailure(t *testing.T) {
	f := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{
			"one":   {Kind: adapter.KindSuccess},
			"two":   {Kind: adapter.KindFatal, Message: "nope"},
			"three": {Kind: adapter.KindSuccess},
		},
	}
	plan := Plan{Steps: []Step{
		{Effect: EffectWrite, Command: adapter.Command{ID: "one"}},
		{Effect: EffectWrite, Command: adapter.Command{ID: "two"}},
		{Effect: EffectWrite, Command: adapter.Command{ID: "three"}},
	}}

	outcomes := plan.Execute(context.Background(), f)
	if len(outcomes) != 2 {
		t.Fatalf("expected execution to stop after the failing step, got %d outcomes", len(outcomes))
	}
	if len(f.Calls) != 2 {
		t.Fatalf("expected 2 calls (third never runs), got %d", len(f.Calls))
	}
	if outcomes[1].Accepted {
		t.Fatal("expected the second step to be not accepted")
	}
	if !PartiallyApplied(outcomes) {
		t.Fatal("expected PartiallyApplied=true (the first write committed)")
	}
}

// already-done counts as success ONLY when the step allows it, and the real Kind
// is preserved in the outcome (not rewritten to success).
func TestPlanAllowedAlreadyDoneIsAcceptedAndPreserved(t *testing.T) {
	f := &adapter.FakeRunner{Responses: map[string]adapter.Result{"x": {Kind: adapter.KindAlreadyDone}}}
	plan := Plan{Steps: []Step{{Effect: EffectWrite, AllowAlreadyDone: true, Command: adapter.Command{ID: "x"}}}}

	outcomes := plan.Execute(context.Background(), f)
	if !Succeeded(outcomes) {
		t.Fatal("expected an allowed already-done step to count as success")
	}
	if outcomes[0].Result.Kind != adapter.KindAlreadyDone {
		t.Fatalf("expected the real Kind to be preserved, got %v", outcomes[0].Result.Kind)
	}
}

// already-done must NOT be accepted when the step does not allow it.
func TestPlanDisallowedAlreadyDoneIsRejected(t *testing.T) {
	f := &adapter.FakeRunner{Responses: map[string]adapter.Result{"x": {Kind: adapter.KindAlreadyDone}}}
	plan := Plan{Steps: []Step{
		{Effect: EffectWrite, AllowAlreadyDone: false, Command: adapter.Command{ID: "x"}},
		{Effect: EffectWrite, Command: adapter.Command{ID: "y"}},
	}}

	outcomes := plan.Execute(context.Background(), f)
	if Succeeded(outcomes) {
		t.Fatal("expected disallowed already-done to NOT be accepted")
	}
	if len(outcomes) != 1 {
		t.Fatalf("expected the plan to stop at the rejected step, got %d outcomes", len(outcomes))
	}
}

func TestNormalizeExampleRejectsBadInput(t *testing.T) {
	if _, _, err := NormalizeExample(ExampleRequest{Host: "", Port: 443, Secret: "s"}); err == nil {
		t.Error("expected error for empty host")
	}
	if _, _, err := NormalizeExample(ExampleRequest{Host: "h", Port: 0, Secret: "s"}); err == nil {
		t.Error("expected error for out-of-range port")
	}
	if _, _, err := NormalizeExample(ExampleRequest{Host: "h", Port: 443, Secret: ""}); err == nil {
		t.Error("expected error for empty secret (must match the frontend)")
	}
	if _, _, err := NormalizeExample(ExampleRequest{Host: "h", Port: 443, Secret: "a\nb"}); err == nil {
		t.Error("expected error for control characters in secret")
	}
	if _, _, err := NormalizeExample(ExampleRequest{Host: " h ", Port: 443, Secret: "ok"}); err != nil {
		t.Errorf("expected a valid request to pass, got %v", err)
	}
}
