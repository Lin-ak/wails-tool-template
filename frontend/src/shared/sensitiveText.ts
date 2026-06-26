// Redact secrets from text before it is shown to the user. Wails tools commonly
// surface backend command lines, stderr, config dumps and diagnostics — any of
// which can echo a password, token, PSK or private key. Run every such string
// through this before rendering it (see ExampleForm / ApplyOperation).
//
// Deliberately CONSERVATIVE to avoid mangling ordinary output. It only acts on a
// small set of unambiguous secret field/flag names — NOT generic words like
// "key", "ca" or "cert" that appear in normal paths and error messages (e.g.
// "Primary key: id", "cert: expired", "/etc/ca/bundle.pem" are left untouched).
// A tool with domain-specific secret names can extend SECRET_NAMES below.
const SECRET_NAMES =
  "password|passwd|pwd|secret|token|api[_-]?key|access[_-]?token|private[_-]?key|client[_-]?key|psk";

// name: value / name = value, where name is one of the secret names above. The
// leading boundary (not a letter/digit/_/-) keeps it from matching inside longer
// identifiers ("public_key_hint") or paths ("/etc/ca/").
const FIELD = new RegExp(
  `(^|[^A-Za-z0-9_-])("?(?:${SECRET_NAMES})"?\\s*[:=]\\s*)(?:"[^"]*"|'[^']*'|[^\\s,}#;]+)`,
  "gi",
);

// CLI flag forms: --password value, /PASSWORD:value, -secret=value.
const FLAG = new RegExp(
  `((?:--?|/)(?:${SECRET_NAMES})\\s*(?:[:=]|\\s+))(?:"[^"]*"|'[^']*'|[^\\s#;]+)`,
  "gi",
);

// Whole PEM blocks (private keys, certs) — drop the body entirely.
const PEM = /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g;

export function sanitizeSensitiveText(value?: string) {
  if (!value) {
    return "";
  }
  return value
    .replace(PEM, "<pem hidden>")
    .replace(FIELD, "$1$2<hidden>")
    .replace(FLAG, "$1<hidden>");
}
