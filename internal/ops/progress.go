package ops

// Progress is a single update emitted as a plan executes. It is JSON-serializable
// so the Wails emitter can forward it straight to the UI.
type Progress struct {
	OpID  string `json:"opId"`
	Step  int    `json:"step"`  // 1-based index of the current step
	Total int    `json:"total"` // total number of steps
	Name  string `json:"name"`  // human-readable step name
	Kind  string `json:"kind"`  // classified result kind once the step finishes
	Done  bool   `json:"done"`  // true on the final update of the operation
}

// Emitter delivers progress updates to the UI. The Wails implementation lives in
// package main (runtime.EventsEmit); internal code depends only on this
// interface, keeping it offline-testable.
type Emitter interface {
	Emit(p Progress)
}

// EmitterFunc adapts a plain function to the Emitter interface.
type EmitterFunc func(Progress)

func (f EmitterFunc) Emit(p Progress) { f(p) }

// NopEmitter discards progress — the default, and convenient in tests.
type NopEmitter struct{}

func (NopEmitter) Emit(Progress) {}
