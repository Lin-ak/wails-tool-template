import type { Progress } from "./types";

type Unsubscribe = () => void;

interface WailsRuntime {
  EventsOn(event: string, callback: (...data: unknown[]) => void): Unsubscribe;
}

declare global {
  interface Window {
    runtime?: WailsRuntime;
  }
}

// Subscribe to operation progress emitted by Go (runtime.EventsEmit
// "op:progress"). Returns an unsubscribe function — a no-op when the Wails
// runtime is absent (plain `vite`, unit tests), so callers need no guards.
export function onProgress(callback: (p: Progress) => void): Unsubscribe {
  const rt = window.runtime;
  if (!rt) {
    return () => {};
  }
  return rt.EventsOn("op:progress", (p) => callback(p as Progress));
}
