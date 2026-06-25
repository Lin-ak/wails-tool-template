package adapter

import (
	"context"
	"testing"
)

func TestFakeRunnerReturnsScriptedResult(t *testing.T) {
	f := &FakeRunner{
		Responses: map[string]Result{
			"a": {Kind: KindSuccess},
			"b": {Kind: KindFatal, Message: "boom"},
		},
		Default: Result{Kind: KindNotFound},
	}

	if got := f.Run(context.Background(), Command{ID: "a"}); !got.OK() {
		t.Fatalf("expected a to succeed, got %+v", got)
	}
	if got := f.Run(context.Background(), Command{ID: "b"}); got.OK() {
		t.Fatalf("expected b to fail")
	}
	if got := f.Run(context.Background(), Command{ID: "missing"}); got.Kind != KindNotFound {
		t.Fatalf("expected default Kind for unknown id, got %v", got.Kind)
	}
	if len(f.Calls) != 3 {
		t.Fatalf("expected 3 recorded calls, got %d", len(f.Calls))
	}
}

func TestResultOK(t *testing.T) {
	cases := map[Kind]bool{
		KindSuccess:     true,
		KindAlreadyDone: true,
		KindNotFound:    false,
		KindTransient:   false,
		KindFatal:       false,
	}
	for kind, want := range cases {
		if got := (Result{Kind: kind}).OK(); got != want {
			t.Errorf("%v.OK() = %v, want %v", kind, got, want)
		}
	}
}
