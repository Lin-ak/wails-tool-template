import type {
  ApplyResult,
  ExampleRequest,
  ExampleResult,
  PreflightResult,
} from "./types";

// Wails injects bound Go methods on window.go.<package>.<StructName>. The bound
// object is `*app.API` (main.go Bind), so it is exposed as window.go.app.API —
// the STRUCT name, not "App". We wrap it in a typed facade so feature code never
// touches the global and we get one place for logging or mocks. Once initialized
// with Wails you can instead import the generated bindings from
// `wailsjs/go/app/API` and drop the window plumbing.
interface Bridge {
  DoExample(req: ExampleRequest): Promise<ExampleResult>;
  PlanExample(req: ExampleRequest): Promise<PreflightResult>;
  ApplyExample(req: ExampleRequest, opId: string): Promise<ApplyResult>;
  CancelOperation(id: string): Promise<boolean>;
}

declare global {
  interface Window {
    go?: { app?: { API?: Bridge } };
  }
}

function bridge(): Bridge {
  const b = window.go?.app?.API;
  if (!b) {
    // List what IS bound so a renamed struct/package self-diagnoses instead of
    // presenting as a generic "bridge unavailable" (see doc/GOTCHAS.md).
    const bound = Object.keys(window.go?.app ?? {}).join(", ") || "nothing";
    throw new Error(
      `Wails bridge unavailable: window.go.app.API missing (bound: ${bound}). Run via \`wails dev\`.`,
    );
  }
  return b;
}

export const client = {
  doExample: (req: ExampleRequest) => bridge().DoExample(req),
  planExample: (req: ExampleRequest) => bridge().PlanExample(req),
  applyExample: (req: ExampleRequest, opId: string) =>
    bridge().ApplyExample(req, opId),
  cancelOperation: (id: string) => bridge().CancelOperation(id),
};
