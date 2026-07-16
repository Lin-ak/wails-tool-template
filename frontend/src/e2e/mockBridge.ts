import type {
  ApplyResult,
  ExampleRequest,
  ExampleResult,
  PreflightResult,
  Progress,
} from "@/bridge/types";

// Mock Wails bridge for browser E2E / visual dev: installs window.go.app.API +
// window.runtime so the REAL app renders and runs the safe-write loop without a
// Go backend. Dev-only — loaded solely by e2e.html, which `vite build` never
// bundles (it only takes index.html). Point it at your real bound methods when
// you wire up a new feature. The key MUST mirror the real bound struct name
// (window.go.<package>.<StructName>) or E2E green stops proving anything — see
// doc/GOTCHAS.md "Wails bridge".

type Cb = (...data: unknown[]) => void;

// A preflight with one whitelisted, changing field → drives the confirm dialog.
function planFor(req: ExampleRequest): PreflightResult {
  return {
    title: `${req.host} config`,
    current: { timeout: "30" },
    planned: { timeout: "60" },
    diff: [
      {
        field: "timeout",
        label: "Timeout (s)",
        current: "30",
        planned: "60",
        allowed: true,
      },
    ],
    allowedDiffFields: ["timeout"],
    unexpectedDiffFields: [],
    hasWriteDiff: true,
    canWrite: true,
    message: "1 field will change.",
  };
}

export function installMockBridge({ stepDelayMs = 200 } = {}) {
  const listeners: Record<string, Cb[]> = {};
  const emit = (event: string, ...data: unknown[]) => {
    for (const cb of listeners[event] ?? []) {
      cb(...data);
    }
  };

  window.runtime = {
    EventsOn(event: string, cb: Cb) {
      listeners[event] ??= [];
      listeners[event].push(cb);
      return () => {
        listeners[event] = (listeners[event] ?? []).filter((f) => f !== cb);
      };
    },
  };

  const steps = ["connect", "write", "verify"] as const;

  window.go = {
    app: {
      API: {
        DoExample: async (req: ExampleRequest): Promise<ExampleResult> => ({
          ok: true,
          kind: "ok",
          output: `probed ${req.host}:${req.port}`,
        }),
        PlanExample: async (req: ExampleRequest): Promise<PreflightResult> =>
          planFor(req),
        ApplyExample: async (
          _req: ExampleRequest,
          opId: string,
        ): Promise<ApplyResult> => {
          for (let i = 0; i < steps.length; i++) {
            const progress: Progress = {
              opId,
              step: i + 1,
              total: steps.length,
              name: steps[i],
              kind: "step",
              done: steps[i] === "verify",
            };
            emit("op:progress", progress);
            await new Promise((r) => setTimeout(r, stepDelayMs));
          }
          return {
            opId,
            ok: true,
            partial: false,
            canceled: false,
            steps: steps.map((name) => ({
              name,
              kind: "success",
              code: 0,
              durationMs: 12,
            })),
            readback: { timeout: "60" },
          };
        },
        CancelOperation: async (): Promise<boolean> => true,
      },
    },
  };
}
