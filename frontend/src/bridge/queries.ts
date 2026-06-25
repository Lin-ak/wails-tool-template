import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

// useApplyExample wires the multi-step apply: it subscribes to progress events
// while the mutation runs, exposes the latest Progress, and a cancel() that
// targets the in-flight operation by id.
export function useApplyExample() {
  const [progress, setProgress] = useState<Progress | null>(null);

  const mutation = useMutation({
    mutationFn: async (req: ExampleRequest) => {
      setProgress(null);
      const unsubscribe = onProgress(setProgress);
      try {
        return await client.applyExample(req);
      } finally {
        unsubscribe();
      }
    },
  });

  const cancel = () => {
    if (progress?.opId) {
      void client.cancelOperation(progress.opId);
    }
  };

  return { ...mutation, progress, cancel };
}
