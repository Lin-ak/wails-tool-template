package adapter

import "context"

// FakeRunner returns scripted Results keyed by Command.ID and records every call
// for assertions. It is the first-class test seam: write it before the real
// impl, and every flow becomes testable without the external system.
type FakeRunner struct {
	Responses map[string]Result // keyed by Command.ID
	Default   Result            // returned when an ID has no scripted response
	Calls     []Command         // recorded in order
}

// Run records the command and returns its scripted (or default) Result.
func (f *FakeRunner) Run(_ context.Context, cmd Command) Result {
	f.Calls = append(f.Calls, cmd)
	if r, ok := f.Responses[cmd.ID]; ok {
		return r
	}
	return f.Default
}
