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
		{Command: adapter.Command{ID: "one"}},
		{Command: adapter.Command{ID: "two"}},
		{Command: adapter.Command{ID: "three"}},
	}}

	results := plan.Execute(context.Background(), f)
	if len(results) != 2 {
		t.Fatalf("expected execution to stop after the failing step, got %d results", len(results))
	}
	if len(f.Calls) != 2 {
		t.Fatalf("expected 2 calls (third never runs), got %d", len(f.Calls))
	}
	if !Committed(results) {
		t.Fatal("expected Committed=true since the first step succeeded")
	}
}

func TestPlanTreatsAlreadyDoneAsSuccessWhenAllowed(t *testing.T) {
	f := &adapter.FakeRunner{
		Responses: map[string]adapter.Result{"x": {Kind: adapter.KindAlreadyDone}},
	}
	plan := Plan{Steps: []Step{{Command: adapter.Command{ID: "x"}, AllowAlreadyDone: true}}}

	results := plan.Execute(context.Background(), f)
	if len(results) != 1 || !results[0].OK() {
		t.Fatalf("expected already-done to count as success, got %+v", results)
	}
}

func TestNormalizeExampleRejectsBadInput(t *testing.T) {
	if _, _, err := NormalizeExample(ExampleRequest{Host: "", Port: 443}); err == nil {
		t.Error("expected error for empty host")
	}
	if _, _, err := NormalizeExample(ExampleRequest{Host: "h", Port: 0}); err == nil {
		t.Error("expected error for out-of-range port")
	}
	if _, _, err := NormalizeExample(ExampleRequest{Host: "h", Port: 443, Secret: "a\nb"}); err == nil {
		t.Error("expected error for control characters in secret")
	}
	if _, _, err := NormalizeExample(ExampleRequest{Host: " h ", Port: 443, Secret: "ok"}); err != nil {
		t.Errorf("expected valid request to pass, got %v", err)
	}
}
