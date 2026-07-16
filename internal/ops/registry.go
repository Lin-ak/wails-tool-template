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
	ops map[string]*regEntry
}

// regEntry gives each Begin a unique identity, so a release only removes ITS
// registration — never a newer operation that reused the same id.
type regEntry struct{ cancel context.CancelFunc }

func NewRegistry() *Registry {
	return &Registry{ops: map[string]*regEntry{}}
}

// Begin derives a cancellable context for operation id and registers it. Call
// the returned release func when the operation finishes (defer it) to drop the
// registration and free the context. A duplicate id supersedes the previous
// operation: the old one is cancelled (it could no longer be reached by Cancel
// anyway) and Cancel(id) always targets the newest.
func (r *Registry) Begin(parent context.Context, id string) (context.Context, func()) {
	ctx, cancel := context.WithCancel(parent)
	entry := &regEntry{cancel: cancel}
	r.mu.Lock()
	if prev, ok := r.ops[id]; ok {
		prev.cancel()
	}
	r.ops[id] = entry
	r.mu.Unlock()
	return ctx, func() {
		r.mu.Lock()
		if r.ops[id] == entry {
			delete(r.ops, id)
		}
		r.mu.Unlock()
		cancel()
	}
}

// Cancel cancels the operation with the given id. It returns true if an
// operation was found and cancelled.
func (r *Registry) Cancel(id string) bool {
	r.mu.Lock()
	entry, ok := r.ops[id]
	r.mu.Unlock()
	if ok {
		entry.cancel()
	}
	return ok
}

// Count returns the number of in-flight operations.
func (r *Registry) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.ops)
}
