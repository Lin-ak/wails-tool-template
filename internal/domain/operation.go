package domain

import (
	"context"

	"wails-tool-template/internal/adapter"
	"wails-tool-template/internal/ops"
)

// Effect classifies what a step does to the external system. Partial-completion
// is computed from write steps only — reads and verifies never "commit".
type Effect int

const (
	EffectRead   Effect = iota // observes state; no side effect
	EffectWrite                // mutates external state
	EffectVerify               // re-reads to confirm a prior write
)

// Step is one planned unit of work, its effect, and (for writes) whether an
// already-done result counts as acceptance.
type Step struct {
	Command          adapter.Command
	Effect           Effect
	AllowAlreadyDone bool // write steps only: treat KindAlreadyDone as accepted
}

// Plan is an ordered, inspectable list of steps. Build the whole plan before
// running anything so the UI can show "what will happen" (plan → confirm →
// execute → verify) and so partial completion is detectable.
type Plan struct {
	Steps []Step
}

// StepOutcome pairs a step with its result and whether it was accepted under
// that step's policy. The result's Kind is preserved (never rewritten), so the
// UI and audit logs see the real outcome — e.g. already_done stays already_done.
type StepOutcome struct {
	Step     Step
	Result   adapter.Result
	Accepted bool
}

// Execute runs the steps in order, stopping at the first non-accepted step.
func (p Plan) Execute(ctx context.Context, runner adapter.Runner) []StepOutcome {
	return p.ExecuteWithProgress(ctx, runner, ops.NopEmitter{}, "")
}

// ExecuteWithProgress is Execute plus a progress update before and after each
// step. Acceptance is decided explicitly per step (success, or already-done when
// the step allows it) — it does not rely on a global Result.OK().
func (p Plan) ExecuteWithProgress(ctx context.Context, runner adapter.Runner, emit ops.Emitter, opID string) []StepOutcome {
	if emit == nil {
		emit = ops.NopEmitter{}
	}
	outcomes := make([]StepOutcome, 0, len(p.Steps))
	total := len(p.Steps)

	for i, step := range p.Steps {
		emit.Emit(ops.Progress{OpID: opID, Step: i + 1, Total: total, Name: step.Command.Name})

		res := runner.Run(ctx, step.Command)
		accepted := res.Kind == adapter.KindSuccess ||
			(step.AllowAlreadyDone && res.Kind == adapter.KindAlreadyDone)
		outcomes = append(outcomes, StepOutcome{Step: step, Result: res, Accepted: accepted})

		emit.Emit(ops.Progress{
			OpID: opID, Step: i + 1, Total: total, Name: step.Command.Name,
			Kind: res.Kind.String(), Done: i+1 == total || !accepted,
		})

		if !accepted {
			break
		}
	}
	return outcomes
}

// Succeeded reports whether every step ran and was accepted.
func Succeeded(outcomes []StepOutcome) bool {
	if len(outcomes) == 0 {
		return false
	}
	for _, o := range outcomes {
		if !o.Accepted {
			return false
		}
	}
	return true
}

// PartiallyApplied reports whether a write may have landed: a committed write,
// or a write that failed in an uncertain way (timeout/cancel) where the remote
// side effect may or may not have occurred. Reads and verifies never count.
func PartiallyApplied(outcomes []StepOutcome) bool {
	for _, o := range outcomes {
		if o.Step.Effect != EffectWrite {
			continue
		}
		if o.Accepted {
			return true
		}
		if o.Result.Kind == adapter.KindTransient || o.Result.Kind == adapter.KindCanceled {
			return true
		}
	}
	return false
}

// Canceled reports whether the run ended because it was canceled.
func Canceled(outcomes []StepOutcome) bool {
	for _, o := range outcomes {
		if o.Result.Kind == adapter.KindCanceled {
			return true
		}
	}
	return false
}
