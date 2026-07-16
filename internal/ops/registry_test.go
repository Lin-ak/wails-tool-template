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

func TestRegistryDuplicateIDSupersedes(t *testing.T) {
	r := NewRegistry()

	ctx1, release1 := r.Begin(context.Background(), "op-1")
	ctx2, release2 := r.Begin(context.Background(), "op-1")

	// The duplicate supersedes: the first context is cancelled immediately.
	select {
	case <-ctx1.Done():
	default:
		t.Fatal("expected the superseded operation to be cancelled")
	}

	// The stale release must NOT drop the newer registration.
	release1()
	if r.Count() != 1 {
		t.Fatalf("stale release removed the newer registration: count=%d", r.Count())
	}
	if !r.Cancel("op-1") {
		t.Fatal("expected Cancel to reach the newer operation")
	}
	select {
	case <-ctx2.Done():
	default:
		t.Fatal("expected the newer operation context to be cancelled")
	}

	release2()
	if r.Count() != 0 {
		t.Fatalf("expected 0 in-flight after both releases, got %d", r.Count())
	}
}
