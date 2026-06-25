import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { client } from "./client";
import { onProgress } from "./events";
import type { ExampleRequest, Progress } from "./types";

// One mutation per write action. TanStack Query owns the loading/error/retry
// state that would otherwise be hand-rolled.
export function useDoExample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ExampleRequest) => client.doExample(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });
}

function newOpId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `op-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

// useApplyExample wires the multi-step apply. The operation id is generated
// client-side and passed to the backend, so progress events are filtered to THIS
// operation (no cross-talk between concurrent operations) and Cancel always
// targets the right one.
export function useApplyExample() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const opIdRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (req: ExampleRequest) => {
      const opId = newOpId();
      opIdRef.current = opId;
      setProgress(null);
      const unsubscribe = onProgress((p) => {
        if (p.opId === opId) setProgress(p);
      });
      try {
        return await client.applyExample(req, opId);
      } finally {
        unsubscribe();
      }
    },
  });

  const cancel = () => {
    if (opIdRef.current) {
      void client.cancelOperation(opIdRef.current);
    }
  };

  return { ...mutation, progress, cancel };
}
