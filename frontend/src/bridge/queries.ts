import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
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

// useApplyOperation wires a write call to a client-generated opId, so the
// op:progress events Go emits are filtered to THIS operation (no cross-talk
// between concurrent ops) and Cancel always targets the right one. Every Apply*
// hook is one line on top of this — see useApplyExample.
export function useApplyOperation<Req, Res>(
  applyFn: (req: Req, opId: string) => Promise<Res>,
) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const opIdRef = useRef<string | null>(null);

  const mutation = useMutation<Res, Error, Req>({
    mutationFn: async (req: Req) => {
      const opId = newOpId();
      opIdRef.current = opId;
      setProgress(null);
      const unsubscribe = onProgress((p) => {
        if (p.opId === opId) {
          setProgress(p);
        }
      });
      try {
        return await applyFn(req, opId);
      } finally {
        unsubscribe();
      }
    },
  });

  const cancel = useCallback(() => {
    if (opIdRef.current) {
      void client.cancelOperation(opIdRef.current);
    }
  }, []);

  return { ...mutation, progress, cancel };
}

export function useApplyExample() {
  return useApplyOperation((req: ExampleRequest, opId) =>
    client.applyExample(req, opId),
  );
}
