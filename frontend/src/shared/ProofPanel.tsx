import { useState } from "react";
import {
  Button as AriaButton,
  Disclosure,
  DisclosurePanel,
  Heading,
} from "react-aria-components";
import { Button } from "./Button";
import { copyTextToClipboard } from "./clipboard";
import { sanitizeSensitiveText } from "./sensitiveText";

// A collapsible "evidence" panel for an operation's result: the commands run,
// diagnostics, and raw stdout/stderr. Every line is passed through
// sanitizeSensitiveText before display, and the copy buttons copy the sanitized
// text — so the panel can never leak a secret the backend echoed. The data shape
// is a generic bag of optional fields; populate whatever a given operation has.
export type ProofPanelData = {
  commandLine?: string;
  commands?: string[];
  attempted?: string[];
  probeCommands?: string[];
  diagnostics?: string[];
  warnings?: string[];
  exitCode?: number | string;
  durationMs?: number;
  rawOutput?: string;
  rawError?: string;
  error?: string;
};

type ProofTextBlockID = "rawOutput" | "rawError";
type ProofCopyState = {
  id: ProofTextBlockID;
  status: "success" | "error";
} | null;

const codeBlock =
  "block rounded bg-surface-muted p-2 font-mono text-xs leading-relaxed text-neutral-800 [overflow-wrap:anywhere]";
const blockTitle =
  "m-0 text-xs font-semibold uppercase tracking-wide text-neutral-500";
const triggerStyle =
  "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-neutral-800 outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-brand-500/40";

const preClass = (isExpanded: boolean) =>
  `m-0 overflow-auto whitespace-pre-wrap rounded bg-surface-muted p-2 font-mono text-xs leading-relaxed text-neutral-800 ${isExpanded ? "" : "max-h-40"}`;

export function ProofPanel({
  proof,
  title = "Evidence / Log",
  defaultExpanded,
}: {
  proof: ProofPanelData;
  title?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<ProofTextBlockID, boolean>>({
    rawOutput: false,
    rawError: false,
  });
  const [copyState, setCopyState] = useState<ProofCopyState>(null);

  const hasFailure = proofHasFailure(proof);
  const commandLines = compactLines([
    proof.commandLine,
    ...(proof.commands ?? []),
  ]);
  const probeLines = compactLines([
    ...(proof.probeCommands ?? []),
    ...(proof.attempted ?? []),
  ]);
  const diagnosticLines = compactLines(proof.diagnostics ?? []);
  const warningLines = compactLines(proof.warnings ?? []);
  const resultLines = compactLines([
    proof.exitCode === undefined || proof.exitCode === ""
      ? ""
      : `Exit code: ${proof.exitCode}`,
    proof.durationMs === undefined
      ? ""
      : `Duration: ${formatDuration(proof.durationMs)}`,
  ]);
  const outputText = sanitizeSensitiveText(proof.rawOutput) || "No output";
  const errorText =
    [sanitizeSensitiveText(proof.rawError), sanitizeSensitiveText(proof.error)]
      .filter(Boolean)
      .join("\n\n") || "No errors";

  return (
    <Disclosure
      key={hasFailure ? "proof-expanded" : "proof-collapsed"}
      defaultExpanded={defaultExpanded ?? hasFailure}
      className="rounded-panel border border-border bg-surface"
    >
      <Heading className="m-0">
        <AriaButton slot="trigger" className={triggerStyle}>
          {title}
        </AriaButton>
      </Heading>
      <DisclosurePanel>
        <div className="grid gap-4 px-4 pb-4">
          <ProofBlock
            title="Commands"
            lines={commandLines.length ? commandLines : ["No commands"]}
          />
          <ProofBlock
            title="Probes"
            lines={probeLines.length ? probeLines : ["No probe records"]}
          />
          <ProofBlock
            title="Diagnostics"
            lines={
              diagnosticLines.length ? diagnosticLines : ["No diagnostics"]
            }
          />
          <ProofBlock
            title="Notices"
            lines={warningLines.length ? warningLines : ["No notices"]}
          />
          <ProofBlock
            title="Results"
            lines={resultLines.length ? resultLines : ["No results"]}
          />

          <ProofTextBlock
            title="Raw output"
            text={outputText}
            isExpanded={expanded.rawOutput}
            copyStatus={copyState?.id === "rawOutput" ? copyState.status : null}
            onToggleExpanded={() =>
              setExpanded((c) => ({ ...c, rawOutput: !c.rawOutput }))
            }
            onCopy={(text) =>
              void copyProofText("rawOutput", text, setCopyState)
            }
          />
          <ProofTextBlock
            title="Error output"
            text={errorText}
            isExpanded={expanded.rawError}
            copyStatus={copyState?.id === "rawError" ? copyState.status : null}
            onToggleExpanded={() =>
              setExpanded((c) => ({ ...c, rawError: !c.rawError }))
            }
            onCopy={(text) =>
              void copyProofText("rawError", text, setCopyState)
            }
          />
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

// An operation failed if it reported an error, wrote to stderr, or exited
// non-zero. Drives whether the panel starts expanded.
function proofHasFailure(proof: ProofPanelData) {
  const exitCode =
    proof.exitCode === undefined || proof.exitCode === ""
      ? ""
      : String(proof.exitCode);
  return Boolean(
    proof.error?.trim() ||
      proof.rawError?.trim() ||
      (exitCode && exitCode !== "0"),
  );
}

function formatDuration(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function compactLines(lines: Array<string | undefined | null>) {
  return lines
    .map((line) => line?.trim() ?? "")
    .filter((line): line is string => line.length > 0);
}

function ProofBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className={blockTitle}>{title}</h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {lines.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static evidence lines, rendered once and never reordered; content can repeat
          <li className="min-w-0" key={`${title}-${index}`}>
            <code className={codeBlock}>{sanitizeSensitiveText(line)}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProofTextBlock(props: {
  title: string;
  text: string;
  isExpanded: boolean;
  copyStatus: "success" | "error" | null;
  onToggleExpanded: () => void;
  onCopy: (text: string) => void;
}) {
  const hasCopyableText = Boolean(
    props.text.trim() &&
      props.text !== "No output" &&
      props.text !== "No errors",
  );
  const copyStatusText =
    props.copyStatus === "success"
      ? "Copied"
      : props.copyStatus === "error"
        ? "Copy failed"
        : "";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold text-neutral-800">
          {props.title}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={
              props.copyStatus === "error"
                ? "text-xs text-red-700"
                : "text-xs text-neutral-500"
            }
            aria-live="polite"
          >
            {copyStatusText}
          </span>
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Copy ${props.title}`}
            isDisabled={!hasCopyableText}
            onPress={() => props.onCopy(props.text)}
          >
            Copy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label={`${props.isExpanded ? "Collapse" : "Expand"} ${props.title}`}
            onPress={props.onToggleExpanded}
          >
            {props.isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>
      <pre className={preClass(props.isExpanded)}>{props.text}</pre>
    </div>
  );
}

async function copyProofText(
  id: ProofTextBlockID,
  text: string,
  setCopyState: (value: ProofCopyState) => void,
) {
  try {
    await copyTextToClipboard(text);
    setCopyState({ id, status: "success" });
  } catch {
    setCopyState({ id, status: "error" });
  }
  window.setTimeout(() => setCopyState(null), 1200);
}
