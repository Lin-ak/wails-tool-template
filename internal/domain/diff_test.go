package domain

import (
	"strings"
	"testing"
)

func TestBuildDiffOnlyChangedSubmittedFields(t *testing.T) {
	current := map[string]any{"host": "old", "port": "80", "mode": "auto"}
	planned := map[string]any{"host": "new", "port": "80"} // mode not submitted
	diff := BuildDiffForSubmittedFields(current, planned, map[string]bool{"host": true})
	if len(diff) != 1 {
		t.Fatalf("expected 1 entry (host changed, port equal, mode unsubmitted), got %+v", diff)
	}
	e := diff[0]
	if e.Field != "host" || e.Current != "old" || e.Planned != "new" || !e.Allowed {
		t.Fatalf("unexpected entry: %+v", e)
	}
}

func TestBuildDiffMarksNonWhitelistedFields(t *testing.T) {
	diff := BuildDiffForSubmittedFields(
		map[string]any{"host": "old", "mode": "auto"},
		map[string]any{"host": "new", "mode": "manual"},
		map[string]bool{"host": true},
	)
	if len(diff) != 2 {
		t.Fatalf("expected 2 entries, got %+v", diff)
	}
	// Sorted by field name: host, mode.
	if !diff[0].Allowed || diff[1].Allowed {
		t.Fatalf("expected host allowed and mode not, got %+v", diff)
	}
}

func TestMaskDiffValuesHidesSensitiveFields(t *testing.T) {
	diff := BuildDiffForSubmittedFields(
		map[string]any{"password": "old-secret", "host": "old"},
		map[string]any{"password": "new-secret", "host": "new"},
		map[string]bool{"password": true, "host": true},
	)
	MaskDiffValues(diff, map[string]bool{"password": true})
	for _, e := range diff {
		if e.Field == "password" {
			if strings.Contains(e.Current+e.Planned, "secret") {
				t.Fatalf("sensitive value leaked: %+v", e)
			}
		}
		if e.Field == "host" && e.Planned != "new" {
			t.Fatalf("non-sensitive value should stay visible: %+v", e)
		}
	}
}

func TestApplyDiffLabels(t *testing.T) {
	diff := []DiffEntry{{Field: "host", Label: "host"}, {Field: "port", Label: "port"}}
	ApplyDiffLabels(diff, map[string]string{"host": "Host name"})
	if diff[0].Label != "Host name" || diff[1].Label != "port" {
		t.Fatalf("unexpected labels: %+v", diff)
	}
}

func TestBuildPreflightStates(t *testing.T) {
	allowed := map[string]bool{"host": true}

	same := BuildPreflight("t", map[string]any{"host": "a"}, map[string]any{"host": "a"}, allowed)
	if same.HasWriteDiff || !same.CanWrite {
		t.Fatalf("expected no-diff writable preflight, got %+v", same)
	}

	changed := BuildPreflight("t", map[string]any{"host": "a"}, map[string]any{"host": "b"}, allowed)
	if !changed.HasWriteDiff || !changed.CanWrite {
		t.Fatalf("expected pending writable preflight, got %+v", changed)
	}

	blocked := BuildPreflight("t",
		map[string]any{"host": "a", "mode": "auto"},
		map[string]any{"host": "a", "mode": "manual"}, allowed)
	if blocked.CanWrite || len(blocked.UnexpectedDiffFields) != 1 || blocked.UnexpectedDiffFields[0] != "mode" {
		t.Fatalf("expected blocked preflight naming mode, got %+v", blocked)
	}
}

func TestChangedFieldsUnionAndOrder(t *testing.T) {
	got := ChangedFields(
		map[string]any{"a": 1, "b": 2, "gone": "x"},
		map[string]any{"a": 1, "b": 3, "new": "y"},
	)
	want := []string{"b", "gone", "new"}
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, got)
		}
	}
}

func TestVerifyPostWriteFields(t *testing.T) {
	allowed := map[string]bool{"host": true, "port": true}
	planned := map[string]any{"host": "new", "port": "443"}
	before := map[string]any{"host": "old", "port": "80", "mode": "auto", "updated_at": "1"}

	ok := map[string]any{"host": "new", "port": "443", "mode": "auto", "updated_at": "2"}
	if err := VerifyPostWriteFields(before, ok, planned, allowed,
		[]string{"host", "port"}, map[string]bool{"updated_at": true}, "example"); err != nil {
		t.Fatalf("expected pass (updated_at ignored), got %v", err)
	}

	drift := map[string]any{"host": "new", "port": "443", "mode": "manual", "updated_at": "1"}
	if err := VerifyPostWriteFields(before, drift, planned, allowed, nil, nil, "example"); err == nil ||
		!strings.Contains(err.Error(), "mode") {
		t.Fatalf("expected unexpected-field error naming mode, got %v", err)
	}

	mismatch := map[string]any{"host": "new", "port": "80", "mode": "auto", "updated_at": "1"}
	if err := VerifyPostWriteFields(before, mismatch, planned, allowed,
		[]string{"host", "port"}, nil, "example"); err == nil ||
		!strings.Contains(err.Error(), "port") {
		t.Fatalf("expected read-back mismatch naming port, got %v", err)
	}
}
