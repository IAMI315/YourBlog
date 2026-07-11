"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saved" | "unsynced" | "conflict";

export type AutosaveResult =
  | { ok: true; revision: number }
  | { ok: false; code: "REVISION_CONFLICT" };

export type AutosaveSaveInput = {
  articleId: string;
  value: Record<string, unknown>;
  expectedRevision: number;
};

type AutosaveOptions = {
  articleId: string;
  value: Record<string, unknown>;
  revision: number;
  save?: (input: AutosaveSaveInput) => Promise<AutosaveResult>;
};

export function useAutosave({ articleId, value, revision, save }: AutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [currentRevision, setCurrentRevision] = useState(revision);
  const currentRevisionRef = useRef(revision);
  const didMountRef = useRef(false);
  const requestIdRef = useRef(0);
  const latestValueRef = useRef(value);
  const serializedValue = JSON.stringify(value);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!save) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const valueSnapshot = latestValueRef.current;
    setStatus("pending");

    const timeout = window.setTimeout(async () => {
      try {
        const result = await save({
          articleId,
          value: valueSnapshot,
          expectedRevision: currentRevisionRef.current,
        });

        if (requestIdRef.current !== requestId) return;
        if (result.ok) {
          currentRevisionRef.current = result.revision;
          setCurrentRevision(result.revision);
          setStatus("saved");
        } else if (result.code === "REVISION_CONFLICT") {
          setStatus("conflict");
        }
      } catch {
        if (requestIdRef.current === requestId) {
          setStatus("unsynced");
        }
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [articleId, save, serializedValue]);

  return { currentRevision, isSaving: status === "pending", status };
}
