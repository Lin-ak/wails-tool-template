// Package domain holds framework-agnostic logic: request normalization,
// validation, and operation planning. It imports no UI/Wails packages, so it is
// fully unit-testable and portable.
package domain

import (
	"errors"
	"strconv"
	"strings"
)

// ExampleRequest is the raw, untrusted input handed in from the UI.
type ExampleRequest struct {
	Host   string
	Port   int
	Secret string
}

// NormalizedExample is the validated, safe-to-use form. Construct it only via
// NormalizeExample so invariants hold everywhere downstream.
type NormalizedExample struct {
	Host   string
	Port   int
	Secret string
}

// Args renders the external-tool arguments for this request.
func (n NormalizedExample) Args() []string {
	return []string{"--host", n.Host, "--port", strconv.Itoa(n.Port)}
}

// NormalizeExample validates and normalizes a request. It returns warnings for
// non-fatal issues and an error for fatal ones. Reject control characters in
// secrets so they can never break the argument/stdin boundary.
func NormalizeExample(req ExampleRequest) (NormalizedExample, []string, error) {
	var warnings []string

	host := strings.TrimSpace(req.Host)
	if host == "" {
		return NormalizedExample{}, warnings, errors.New("host is required")
	}
	if req.Port < 1 || req.Port > 65535 {
		return NormalizedExample{}, warnings, errors.New("port must be between 1 and 65535")
	}
	if strings.ContainsAny(req.Secret, "\r\n\x00") {
		return NormalizedExample{}, warnings, errors.New("secret contains invalid control characters")
	}
	if req.Secret == "" {
		warnings = append(warnings, "secret is empty")
	}

	return NormalizedExample{Host: host, Port: req.Port, Secret: req.Secret}, warnings, nil
}
