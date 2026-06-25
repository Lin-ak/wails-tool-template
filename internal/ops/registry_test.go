package ops

import (
	"context"
	"testing"
)

func TestRegistryBeginCancelRelease(t *testing.T) {
	r := NewRegistry()

	ctx, release := r.Begin(context.Background(), "op-1")
	if r.Count() != 1 {
		t.Fatalf("expected 1 in-flight operation, got %d", r.Count())
	}

	if !r.Cancel("op-1") {
		t.Fatal("expected Cancel to find op-1")
	}
	select {
	case <-ctx.Done():
	default:
		t.Fatal("expected the operation context to be cancelled")
	}

	release()
	if r.Count() != 0 {
		t.Fatalf("expected 0 in-flight after release, got %d", r.Count())
	}
	if r.Cancel("op-1") {
		t.Fatal("expected Cancel of a released id to return false")
	}
}
