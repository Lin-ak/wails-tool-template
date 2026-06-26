import { describe, expect, it } from "vitest";
import { sanitizeSensitiveText } from "./sensitiveText";

describe("sanitizeSensitiveText", () => {
  it("masks unambiguous secret field and flag forms", () => {
    const cases: Array<[string, string]> = [
      ["password=hunter2", "password=<hidden>"],
      // The example form's field is literally named "secret".
      ["secret = my-real-secret", "secret = <hidden>"],
      ['token: "abcdef123456"', "token: <hidden>"],
      ["api_key: sk-live-12345", "api_key: <hidden>"],
      [
        'script.sh --password "--looks-like-flag"',
        "script.sh --password <hidden>",
      ],
      ["vpncmd.exe /PASSWORD:aa123456", "vpncmd.exe /PASSWORD:<hidden>"],
      ["tool --psk secret-value", "tool --psk <hidden>"],
    ];
    for (const [input, expected] of cases) {
      expect(sanitizeSensitiveText(input)).toBe(expected);
    }
    // None of the secret values survive anywhere in the combined output.
    const combined = sanitizeSensitiveText(cases.map(([i]) => i).join("\n"));
    for (const leak of [
      "hunter2",
      "my-real-secret",
      "abcdef123456",
      "sk-live-12345",
      "--looks-like-flag",
      "aa123456",
      "secret-value",
    ]) {
      expect(combined).not.toContain(leak);
    }
  });

  it("masks PEM blocks without leaking body content", () => {
    const output = sanitizeSensitiveText(`before
-----BEGIN CERTIFICATE-----
MIIBsecret
-----END CERTIFICATE-----
after`);

    expect(output).toContain("<pem hidden>");
    expect(output).not.toContain("MIIBsecret");
  });

  it("does NOT over-sanitize ordinary paths, CLI params, or error messages", () => {
    const businessText = [
      "Failed to open C:\\Users\\admin\\certs\\report.pdf",
      "Error: ENOENT /etc/ca/bundle.pem not found",
      "Run with --host example.com --port 8080 --verbose",
      "Primary key: customer_id violated unique constraint",
      "Sort key: timestamp; partition key: region",
      "cert: expired on 2026-01-01",
      "ca: AcmeCorp Root issued the certificate",
      "key: value pair parsing failed at line 12",
      "Connection refused: host=db.internal port=5432",
      // Sensitive word only as a suffix of a longer identifier — must stay.
      "public_key_hint = safe-to-show",
    ];
    for (const line of businessText) {
      expect(sanitizeSensitiveText(line)).toBe(line);
    }
  });
});
