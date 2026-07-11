"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saved" | "unsynced" | "conflict";

export type AutosaveResult =
  | { ok: true; revision: number }
  | { ok: false; code: "REVISION_CONFLICT" };

type AutosaveOptions = {
  articleId: string;
  value: Record<string, unknown>;
  revision: number;
  save?: (input: {
    articleId: string;
    value: Record<string, unknown>;
    expectedRevision: number;
    signal: AbortSignal;
  }) => Promise<AutosaveResult>;
};

export function useAutosave({ articleId, value, revision, save }: AutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [currentRevision, setCurrentRevision] = useState(revision);
  const currentRevisionRef = useRef(revision);
  const abortRef = useRef<AbortController | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!save) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("pending");

    const timeout = window.setTimeout(async () => {
      try {
        const result = await save({
          articleId,
          value,
          expectedRevision: currentRevisionRef.current,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        if (result.ok) {
          currentRevisionRef.current = result.revision;
          setCurrentRevision(result.revision);
          setStatus("saved");
        } else if (result.code === "REVISION_CONFLICT") {
          setStatus("conflict");
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus("unsynced");
        }
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [articleId, save, value]);

  return { currentRevision, isSaving: status === "pending", status };
}
