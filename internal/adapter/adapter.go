// Package adapter is the external-tool boundary: the one place that runs an
// outside system (a CLI, an RPC service) and classifies the result into a typed
// taxonomy. Every other package depends on the Runner interface, never on the
// raw output of the external system.
package adapter

import (
	"context"
	"time"
)

// Kind is the classified outcome of an external operation. Classifying once, at
// the boundary, is what replaces scattered string-matching across the codebase.
type Kind int

const (
	KindSuccess     Kind = iota // operation completed
	KindNotFound                // target object does not exist
	KindAlreadyDone             // idempotent no-op (already in desired state)
	KindTransient               // retryable / uncertain (timeout, connection reset)
	KindFatal                   // permanent failure
	KindCanceled                // aborted via context cancellation
)

func (k Kind) String() string {
	switch k {
	case KindSuccess:
		return "success"
	case KindNotFound:
		return "not_found"
	case KindAlreadyDone:
		return "already_done"
	case KindTransient:
		return "transient"
	case KindFatal:
		return "fatal"
	case KindCanceled:
		return "canceled"
	default:
		return "unknown"
	}
}

// Result is one classified outcome plus the redacted evidence behind it.
type Result struct {
	Kind       Kind
	Code       int    // upstream error/exit code; 0 on success
	Message    string // concise, human-readable reason; empty on success
	Raw        string // raw output (redact before logging/displaying)
	DurationMs int64
}

// OK reports whether the result counts as a successful step.
func (r Result) OK() bool { return r.Kind == KindSuccess || r.Kind == KindAlreadyDone }

// Command is one declarative unit of work — loggable, fakeable, replayable.
type Command struct {
	ID        string        // stable identifier for logs/results
	Name      string        // the external verb, for display
	Args      []string      // arguments — never secrets (those go in Stdin)
	Stdin     []byte        // optional stdin payload; the safe channel for secrets
	Timeout   time.Duration // per-command bound; 0 = runner default
	Retryable bool          // safe to replay on transient failure (reads/idempotent only)
}

// Runner executes Commands against some external system. The real
// implementation and the test fake both satisfy it, so every call site is
// fakeable without touching the real world.
type Runner interface {
	Run(ctx context.Context, cmd Command) Result
}

// RunnerFunc adapts a plain function to the Runner interface — handy for
// composition and for one-off runners in tests.
type RunnerFunc func(ctx context.Context, cmd Command) Result

func (f RunnerFunc) Run(ctx context.Context, cmd Command) Result { return f(ctx, cmd) }

// Classifier turns raw output + error into a Kind. Each concrete adapter
// supplies its own — this is the ONLY function that knows the external system's
// output dialect.
type Classifier func(stdout, stderr string, exitCode int, err error) (Kind, int, string)
