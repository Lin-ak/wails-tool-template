import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProofPanel } from "./ProofPanel";

describe("ProofPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays and copies the redacted text, never the original secret", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    // A failing proof (rawError set) auto-expands, so the copy button is in the
    // DOM. The error carries a secret in a redactable form.
    render(
      <ProofPanel proof={{ rawError: "applied with password=hunter2" }} />,
    );

    // The displayed evidence is already redacted.
    expect(screen.queryByText(/hunter2/)).toBeNull();

    // And the Copy button copies the redacted text — not the original secret.
    fireEvent.click(screen.getByRole("button", { name: "Copy Error output" }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("password=<hidden>");
    expect(copied).not.toContain("hunter2");
  });
});
