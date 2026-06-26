import { describe, expect, it } from "vitest";
import { sanitizeSensitiveText } from "./sensitiveText";

describe("sanitizeSensitiveText", () => {
  it("masks common command-line password forms", () => {
    const input = [
      'vpncmd.exe /SERVER localhost /PASSWORD:"admin pass with spaces"',
      "vpncmd.exe /PASSWORD:aa123456",
      'script.sh --password "--looks-like-flag"',
      "tool --psk secret-value",
    ].join("\n");

    const output = sanitizeSensitiveText(input);

    expect(output).toContain("/PASSWORD:<hidden>");
    expect(output).toContain("--password <hidden>");
    expect(output).toContain("--psk <hidden>");
    expect(output).not.toContain("admin pass with spaces");
    expect(output).not.toContain("aa123456");
    expect(output).not.toContain("--looks-like-flag");
    expect(output).not.toContain("secret-value");
  });

  it("masks structured fields with quotes, spaces, and mixed casing", () => {
    const output = sanitizeSensitiveText(
      [
        'guestPassword = "root pass"',
        'IPSecPSK: "psk value"',
        '"private_key": "-----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY-----"',
        "stdin password: value with spaces",
      ].join("\n"),
    );

    expect(output).toContain("guestPassword = <hidden>");
    expect(output).toContain("IPSecPSK: <hidden>");
    expect(output).toContain('"private_key": <hidden>');
    expect(output).toContain("stdin password: <hidden>");
    expect(output).not.toContain("root pass");
    expect(output).not.toContain("psk value");
    expect(output).not.toContain("BEGIN PRIVATE KEY");
    expect(output).not.toContain("value with spaces");
  });

  it("does not mask keys that only contain a sensitive word as a suffix", () => {
    const output = sanitizeSensitiveText(
      "monkey = banana\npublic_key_hint = safe-to-show",
    );

    expect(output).toContain("monkey = banana");
    expect(output).toContain("public_key_hint = safe-to-show");
    expect(output).not.toContain("<hidden>");
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
});
