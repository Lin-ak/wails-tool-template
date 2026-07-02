import type { ProofPanelData } from "./ProofPanel";

// Maps a backend write result (domain.WriteResult: written / skipped / summary /
// evidence) onto the ProofPanel's evidence bag once, here, so every feature
// renders proof the same way. ProofPanel redacts every line before display.
export interface WriteResultLike {
  written?: string[];
  skipped?: string[];
  evidence?: string[];
  // The values read back after the write; shape varies per feature (map or
  // typed struct) and may nest, so it's `unknown` and flattened generically.
  summary?: unknown;
}

// Flatten the read-back summary into "field: value" lines (nested maps become
// "wan.ip: …"). Skips empty values and arrays.
function flattenSummary(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const lines: string[] = [];
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(val)) {
      continue;
    }
    if (val && typeof val === "object") {
      lines.push(...flattenSummary(val, label));
    } else if (val !== null && val !== undefined && String(val).trim() !== "") {
      lines.push(`${label}: ${val}`);
    }
  }
  return lines;
}

export function resultProof(result: WriteResultLike): ProofPanelData {
  return {
    commands: result.written?.length ? result.written : undefined,
    diagnostics: result.skipped?.length
      ? result.skipped.map((s) => `Skipped: ${s}`)
      : undefined,
    readback: flattenSummary(result.summary),
    rawOutput: result.evidence?.join("\n"),
  };
}
