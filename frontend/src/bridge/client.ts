import type { ApplyResult, ExampleRequest, ExampleResult } from "./types";

// Wails injects bound Go methods on window.go.<package>.<struct>. The App now
// lives in package `app`, so it is exposed as window.go.app.App. We wrap it in a
// typed facade so feature code never touches the global and we get one place for
// logging or mocks. Once initialized with Wails you can instead import the
// generated bindings from `wailsjs/go/app/App` and drop the window plumbing.
interface Bridge {
  DoExample(req: ExampleRequest): Promise<ExampleResult>;
  ApplyExample(req: ExampleRequest): Promise<ApplyResult>;
  CancelOperation(id: string): Promise<boolean>;
}

declare global {
  interface Window {
    go?: { app?: { App?: Bridge } };
  }
}

function bridge(): Bridge {
  const b = window.go?.app?.App;
  if (!b) {
    throw new Error("Wails bridge unavailable (run via `wails dev`).");
  }
  return b;
}

export const client = {
  doExample: (req: ExampleRequest) => bridge().DoExample(req),
  applyExample: (req: ExampleRequest) => bridge().ApplyExample(req),
  cancelOperation: (id: string) => bridge().CancelOperation(id),
};
