// Package ops manages in-flight operation lifecycle: per-operation cancellation
// and progress streaming. It depends only on the standard library so it stays
// offline-testable; the Wails-specific progress emitter lives in package main.
package ops

import (
	"context"
	"sync"
)

// Registry tracks running operations so the UI can cancel them by id.
type Registry struct {
	mu  sync.Mutex
	ops map[string]context.CancelFunc
}

func NewRegistry() *Registry {
	return &Registry{ops: map[string]context.CancelFunc{}}
}

// Begin derives a cancellable context for operation id and registers it. Call
// the returned release func when the operation finishes (defer it) to drop the
// registration and free the context.
func (r *Registry) Begin(parent context.Context, id string) (context.Context, func()) {
	ctx, cancel := context.WithCancel(parent)
	r.mu.Lock()
	r.ops[id] = cancel
	r.mu.Unlock()
	return ctx, func() {
		r.mu.Lock()
		delete(r.ops, id)
		r.mu.Unlock()
		cancel()
	}
}

// Cancel cancels the operation with the given id. It returns true if an
// operation was found and cancelled.
func (r *Registry) Cancel(id string) bool {
	r.mu.Lock()
	cancel, ok := r.ops[id]
	r.mu.Unlock()
	if ok {
		cancel()
	}
	return ok
}

// Count returns the number of in-flight operations.
func (r *Registry) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.ops)
}
