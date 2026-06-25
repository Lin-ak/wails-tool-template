// Package logging provides a structured logger and a secret redactor. Build
// observability in from day one: every external command and its classified
// outcome should be logged (redacted), so a field bug is a log line, not a
// mystery that only reproduces on the customer's machine.
package logging

import (
	"log/slog"
	"os"
)

// New returns a structured JSON logger writing to stderr. JSON keeps logs
// machine-parseable; switch to slog.NewTextHandler for friendlier dev output.
func New() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))
}
