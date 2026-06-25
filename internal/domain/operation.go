package domain

import (
	"context"

	"wails-tool-template/internal/adapter"
	"wails-tool-template/internal/ops"
)

// Step is one planned unit of work plus how to interpret an already-done state.
type Step struct {
	Command          adapter.Command
	AllowAlreadyDone bool // treat KindAlreadyDone as success (idempotent writes)
}

// Plan is an ordered, inspectable list of steps. Build the whole plan before
// running anything so the UI can show "what will happen" (plan → confirm →
// execute → verify) and so partial completion is detectable.
type Plan struct {
	Steps []Step
}

// Execute runs the steps in order, stopping at the first hard failure.
func (p Plan) Execute(ctx context.Context, runner adapter.Runner) []adapter.Result {
	return p.ExecuteWithProgress(ctx, runner, ops.NopEmitter{}, "")
}

// ExecuteWithProgress is Execute plus a progress update before and after each
// step. It returns one Result per attempted step, so the caller can attribute
// success/failure per step and tell whether the run stopped partway.
func (p Plan) ExecuteWithProgress(ctx context.Context, runner adapter.Runner, emit ops.Emitter, opID string) []adapter.Result {
	if emit == nil {
		emit = ops.NopEmitter{}
	}
	results := make([]adapter.Result, 0, len(p.Steps))
	total := len(p.Steps)

	for i, step := range p.Steps {
		emit.Emit(ops.Progress{OpID: opID, Step: i + 1, Total: total, Name: step.Command.Name})

		res := runner.Run(ctx, step.Command)
		if res.Kind == adapter.KindAlreadyDone && step.AllowAlreadyDone {
			res.Kind = adapter.KindSuccess
		}
		results = append(results, res)

		emit.Emit(ops.Progress{
			OpID: opID, Step: i + 1, Total: total, Name: step.Command.Name,
			Kind: res.Kind.String(), Done: i+1 == total || !res.OK(),
		})

		if !res.OK() {
			break
		}
	}
	return results
}

// Committed reports whether at least one step succeeded, i.e. whether a later
// failure leaves the external system partially configured.
func Committed(results []adapter.Result) bool {
	for _, r := range results {
		if r.OK() {
			return true
		}
	}
	return false
}
