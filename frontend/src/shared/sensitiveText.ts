// Redact secrets from text before it is shown to the user. Wails tools commonly
// surface backend command lines, stderr, config dumps and diagnostics — any of
// which can echo a password, PSK, token or private key. Run every such string
// through this before rendering it (see ExampleForm / ApplyOperation).
export function sanitizeSensitiveText(value?: string) {
  if (!value) {
    return "";
  }
  return value
    .replace(
      /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g,
      "<pem hidden>",
    )
    .replace(/(\/PASSWORD\s*:\s*)(?:"[^"]*"|'[^']*'|[^\s#;]+)/gi, "$1<hidden>")
    .replace(
      /(stdin password\s*:\s*)(?:"[^"]*"|'[^']*'|[^\n#;]+)/gi,
      "$1<hidden>",
    )
    .replace(
      /(^|[^A-Za-z0-9_-])("?(?:guestPassword|serverPassword|softEtherServerPassword|vpnPassword|openvpnPassword|openvpn_password|wifiPassword|routerNewPassword|router_password|router_new_password|key|key1|ipsecPsk|password|passwd|pwd|psk|tlsAuth|tls_auth|extraConfig|extra_config|ca|cert|private_key|client_key)"?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}#;]+)/gi,
      "$1$2<hidden>",
    )
    .replace(
      /((?:ipsec\s+)?psk\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s#;]+)/gi,
      "$1<hidden>",
    )
    .replace(
      /((?:guest\s+)?password\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s#;]+)/gi,
      "$1<hidden>",
    )
    .replace(
      /\b((?:guest\s+)?password|psk)\s+(?:"[^"]*"|'[^']*'|[^\s#;]+)/gi,
      "$1 <hidden>",
    )
    .replace(
      /((?:passwd|pwd)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s#;]+)/gi,
      "$1<hidden>",
    )
    .replace(
      /((?:--?|\/)(?:password|passwd|pwd|psk)\s*(?:=|:|\s+))(?:"[^"]*"|'[^']*'|[^\s#;]+)/gi,
      "$1<hidden>",
    );
}
