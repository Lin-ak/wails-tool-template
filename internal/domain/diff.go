package domain

import (
	"fmt"
	"sort"
	"strings"
)

// Field-level safe-write primitives. The Plan/Step model (operation.go) governs
// WHICH commands run; these govern WHAT VALUES change: build a whitelisted
// current→planned diff before writing (preflight), show it for confirmation,
// and verify the read-back after the write. Together they make "the tool only
// changed what it said it would" checkable instead of assumed.

// DiffEntry is one field's current → planned change. Allowed marks whether the
// field is in the write whitelist; any entry with Allowed=false should block
// the write (the payload would change something the operation doesn't own).
type DiffEntry struct {
	Field   string `json:"field"`
	Label   string `json:"label"`
	Current string `json:"current"`
	Planned string `json:"planned"`
	Allowed bool   `json:"allowed"`
}

// Preflight is the inspectable "what will change" result computed BEFORE a
// write. The UI shows Diff in a confirm dialog; CanWrite gates the apply.
type Preflight struct {
	Title                string         `json:"title"`
	Current              map[string]any `json:"current"`
	Planned              map[string]any `json:"planned"`
	Diff                 []DiffEntry    `json:"diff"`
	AllowedDiffFields    []string       `json:"allowedDiffFields"`
	UnexpectedDiffFields []string       `json:"unexpectedDiffFields"`
	HasWriteDiff         bool           `json:"hasWriteDiff"`
	CanWrite             bool           `json:"canWrite"`
	Message              string         `json:"message"`
}

// WriteResult is the evidence bag a completed write returns: what was written
// or skipped, the values read back afterwards, and human-readable evidence
// lines. The frontend maps it onto the ProofPanel (see shared/resultProof.ts).
type WriteResult struct {
	Written  []string       `json:"written"`
	Skipped  []string       `json:"skipped"`
	Summary  map[string]any `json:"summary"`
	Evidence []string       `json:"evidence"`
}

// BuildDiffForSubmittedFields compares planned against current, field by field
// (over the planned keys — fields the payload actually submits), and returns
// the changed ones sorted by field name. Fields not in `allowed` are marked
// Allowed=false so the caller can block the write.
func BuildDiffForSubmittedFields(current, planned map[string]any, allowed map[string]bool) []DiffEntry {
	keys := make([]string, 0, len(planned))
	for key := range planned {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	diff := make([]DiffEntry, 0)
	for _, key := range keys {
		currentValue := diffText(current[key])
		plannedValue := diffText(planned[key])
		if currentValue == plannedValue {
			continue
		}
		diff = append(diff, DiffEntry{
			Field:   key,
			Label:   key,
			Current: currentValue,
			Planned: plannedValue,
			Allowed: allowed[key],
		})
	}
	return diff
}

// ApplyDiffLabels replaces each entry's Label using the given map (missing keys
// keep the field name). Returns the slice for chaining.
func ApplyDiffLabels(diff []DiffEntry, labels map[string]string) []DiffEntry {
	for i := range diff {
		if label, ok := labels[diff[i].Field]; ok {
			diff[i].Label = label
		}
	}
	return diff
}

// MaskDiffValues hides the values of sensitive fields (passwords, keys) so a
// diff can be shown or logged without leaking them. The change itself stays
// visible ("hidden" → "hidden (changed)"). Returns the slice for chaining.
func MaskDiffValues(diff []DiffEntry, sensitive map[string]bool) []DiffEntry {
	for i := range diff {
		if !sensitive[diff[i].Field] {
			continue
		}
		diff[i].Current = maskValue(diff[i].Current)
		diff[i].Planned = maskValue(diff[i].Planned)
	}
	return diff
}

func maskValue(value string) string {
	if value == "" {
		return "(empty)"
	}
	return "(hidden)"
}

// BuildPreflight assembles the standard preflight: diff current→planned, split
// out non-whitelisted changes, and derive HasWriteDiff / CanWrite / Message.
func BuildPreflight(title string, current, planned map[string]any, allowed map[string]bool) Preflight {
	diff := BuildDiffForSubmittedFields(current, planned, allowed)
	unexpected := make([]string, 0)
	for _, entry := range diff {
		if !entry.Allowed {
			unexpected = append(unexpected, entry.Field)
		}
	}
	sort.Strings(unexpected)

	message := "Already consistent; the write will be skipped."
	if len(diff) > 0 {
		message = "Changes pending; confirm to write."
	}
	if len(unexpected) > 0 {
		message = "Blocked: fields outside the whitelist would change."
	}

	allowedFields := make([]string, 0, len(allowed))
	for field := range allowed {
		allowedFields = append(allowedFields, field)
	}
	sort.Strings(allowedFields)

	return Preflight{
		Title:                title,
		Current:              current,
		Planned:              planned,
		Diff:                 diff,
		AllowedDiffFields:    allowedFields,
		UnexpectedDiffFields: unexpected,
		HasWriteDiff:         len(diff) > 0,
		CanWrite:             len(unexpected) == 0,
		Message:              message,
	}
}

// ChangedFields returns the sorted set of keys whose stringified value differs
// between before and after (union of both key sets).
func ChangedFields(before, after map[string]any) []string {
	seen := map[string]bool{}
	for key := range before {
		seen[key] = true
	}
	for key := range after {
		seen[key] = true
	}
	keys := make([]string, 0, len(seen))
	for key := range seen {
		if diffText(before[key]) != diffText(after[key]) {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	return keys
}

// VerifyPostWriteFields is the read-back check run AFTER a write: every field
// that changed between before and after must be whitelisted (or explicitly
// ignored — e.g. a server-side timestamp), and every readback field must hold
// its planned value. label prefixes the error for context.
func VerifyPostWriteFields(before, after, planned map[string]any, allowed map[string]bool, readback []string, ignored map[string]bool, label string) error {
	for _, field := range ChangedFields(before, after) {
		if ignored[field] {
			continue
		}
		if !allowed[field] {
			return fmt.Errorf("%s: unexpected field changed after write: %s", label, field)
		}
	}
	for _, field := range readback {
		if diffText(after[field]) != diffText(planned[field]) {
			return fmt.Errorf("%s: read-back mismatch for %s: expected %v, got %v",
				label, field, planned[field], after[field])
		}
	}
	return nil
}

func diffText(value any) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}
