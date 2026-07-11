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
  const [saveCycle, setSaveCycle] = useState(0);
  const currentRevisionRef = useRef(revision);
  const didMountRef = useRef(false);
  const isSavingRef = useRef(false);
  const latestValueRef = useRef(value);
  const queuedSaveRef = useRef(false);
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

    if (isSavingRef.current) {
      queuedSaveRef.current = true;
      setStatus("pending");
      return;
    }

    const valueSnapshot = latestValueRef.current;
    setStatus("pending");

    const timeout = window.setTimeout(async () => {
      isSavingRef.current = true;
      try {
        const result = await save({
          articleId,
          value: valueSnapshot,
          expectedRevision: currentRevisionRef.current,
        });

        if (result.ok) {
          currentRevisionRef.current = result.revision;
          setCurrentRevision(result.revision);
          setStatus("saved");
        } else if (result.code === "REVISION_CONFLICT") {
          setStatus("conflict");
        }
      } catch {
        setStatus("unsynced");
      } finally {
        isSavingRef.current = false;
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          setStatus("pending");
          setSaveCycle((cycle) => cycle + 1);
        }
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [articleId, save, saveCycle, serializedValue]);

  return { currentRevision, isSaving: status === "pending", status };
}
