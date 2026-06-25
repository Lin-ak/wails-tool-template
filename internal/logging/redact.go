package logging

import (
	"sort"
	"strings"
)

// Hidden replaces secret values in any string that gets logged or displayed.
const Hidden = "***"

// Redactor masks known secrets. Construct one per request with that request's
// secrets, then run every log line and every displayed output through Redact.
type Redactor struct{ secrets []string }

// NewRedactor builds a Redactor from zero or more secret values. Blank values
// are dropped, duplicates removed, and the rest sorted longest-first so that a
// short secret which is a prefix of a longer one cannot leave the longer
// secret's suffix exposed.
func NewRedactor(secrets ...string) Redactor {
	seen := make(map[string]struct{}, len(secrets))
	kept := make([]string, 0, len(secrets))
	for _, s := range secrets {
		if strings.TrimSpace(s) == "" {
			continue
		}
		if _, dup := seen[s]; dup {
			continue
		}
		seen[s] = struct{}{}
		kept = append(kept, s)
	}
	sort.SliceStable(kept, func(i, j int) bool { return len(kept[i]) > len(kept[j]) })
	return Redactor{secrets: kept}
}

// Redact replaces every known secret in s with Hidden (longest secrets first).
func (r Redactor) Redact(s string) string {
	for _, secret := range r.secrets {
		s = strings.ReplaceAll(s, secret, Hidden)
	}
	return s
}
