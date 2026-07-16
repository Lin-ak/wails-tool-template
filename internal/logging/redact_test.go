package logging

import "testing"

func TestRedactorRedact(t *testing.T) {
	tests := []struct {
		name    string
		secrets []string
		in      string
		want    string
	}{
		{
			name: "no secrets passes through",
			in:   "plain output",
			want: "plain output",
		},
		{
			name:    "single secret replaced everywhere",
			secrets: []string{"hunter2"},
			in:      "pwd=hunter2 retry pwd=hunter2",
			want:    "pwd=*** retry pwd=***",
		},
		{
			name:    "longest first: a short secret that prefixes a longer one",
			secrets: []string{"abc", "abcdef"},
			in:      "value=abcdef and value=abc",
			want:    "value=*** and value=***",
		},
		{
			name:    "blank and whitespace-only secrets are dropped",
			secrets: []string{"", "   "},
			in:      "a b",
			want:    "a b",
		},
		{
			name:    "duplicate secrets are deduped",
			secrets: []string{"s3cr3t", "s3cr3t"},
			in:      "s3cr3t",
			want:    "***",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NewRedactor(tt.secrets...).Redact(tt.in); got != tt.want {
				t.Errorf("Redact(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

// The longest-first ordering is the security property: were the SHORT secret
// replaced first, the longer secret's suffix would leak ("***def").
func TestRedactorPrefixSecretDoesNotLeakSuffix(t *testing.T) {
	r := NewRedactor("abc", "abcdef")
	if got := r.Redact("abcdef"); got != Hidden {
		t.Fatalf("Redact leaked a suffix: %q", got)
	}
}
