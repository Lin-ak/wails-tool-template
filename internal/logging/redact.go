package logging

import "strings"

// Hidden replaces secret values in any string that gets logged or displayed.
const Hidden = "***"

// Redactor masks known secrets. Construct one per request with that request's
// secrets, then run every log line and every displayed output through Redact.
type Redactor struct{ secrets []string }

// NewRedactor builds a Redactor from zero or more secret values. Blank values
// are ignored so an empty password never turns into a "***" carpet.
func NewRedactor(secrets ...string) Redactor {
	kept := make([]string, 0, len(secrets))
	for _, s := range secrets {
		if strings.TrimSpace(s) != "" {
			kept = append(kept, s)
		}
	}
	return Redactor{secrets: kept}
}

// Redact replaces every known secret in s with Hidden.
func (r Redactor) Redact(s string) string {
	for _, secret := range r.secrets {
		s = strings.ReplaceAll(s, secret, Hidden)
	}
	return s
}
