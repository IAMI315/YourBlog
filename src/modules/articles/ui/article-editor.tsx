"use client";

import { useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";

import { EditorToolbar } from "./editor-toolbar";
import { SlashMenu, slashCommands, type SlashCommand } from "./slash-menu";
import { type AutosaveResult, useAutosave } from "./use-autosave";

type ArticleEditorProps = {
  articleId: string;
  initialRevision: number;
  initialValue: Record<string, unknown>;
  contentFieldName?: string;
  save?: (input: {
    articleId: string;
    value: Record<string, unknown>;
    expectedRevision: number;
    signal: AbortSignal;
  }) => Promise<AutosaveResult>;
};

function textFromDoc(value: Record<string, unknown>) {
  function visit(node: unknown): string[] {
    if (!node || typeof node !== "object") return [];
    const record = node as Record<string, unknown>;
    const ownText = typeof record.text === "string" ? [record.text] : [];
    const childText = Array.isArray(record.content) ? record.content.flatMap(visit) : [];
    return [...ownText, ...childText];
  }

  return visit(value).join(" ");
}

function appendText(value: Record<string, unknown>, text: string): Record<string, unknown> {
  return {
    ...value,
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: `${textFromDoc(value)}${text}`.trim() }] }],
  };
}

function appendBlock(value: Record<string, unknown>, type: string): Record<string, unknown> {
  const content = Array.isArray(value.content) ? value.content : [];
  return { ...value, type: "doc", content: [...content, { type }] };
}

export function ArticleEditor({
  articleId,
  contentFieldName,
  initialRevision,
  initialValue,
  save,
}: ArticleEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [activeType, setActiveType] = useState("paragraph");
  const [slashOpen, setSlashOpen] = useState(false);
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const { isSaving, status } = useAutosave({
    articleId,
    value,
    revision: initialRevision,
    save,
  });
  const serializedValue = useMemo(() => JSON.stringify(value), [value]);

  useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Image,
      Link.configure({ openOnClick: false }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: initialValue,
    immediatelyRender: false,
  });

  function insertCommand(command: SlashCommand) {
    setValue((current) => appendBlock(current, command.type));
    setActiveType(command.type);
    setSlashOpen(false);
  }

  return (
    <section className="article-editor">
      <EditorToolbar activeType={activeType} onSelect={insertCommand} />
      <div className="article-editor__surface">
        <div
          aria-label="Article content"
          className="article-editor__textbox"
          contentEditable
          onInput={(event) => {
            const text = event.currentTarget.textContent ?? "";
            setValue((current) => appendText(current, text.replace("/", "")));
          }}
          onKeyDown={(event) => {
            if (event.key === "/") {
              setSlashOpen(true);
              setActiveSlashIndex(0);
            }

            if (!slashOpen) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveSlashIndex((index) => Math.min(index + 1, slashCommands.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveSlashIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              insertCommand(slashCommands[activeSlashIndex]!);
            }
          }}
          role="textbox"
          suppressContentEditableWarning
          tabIndex={0}
        >
          {textFromDoc(initialValue)}
        </div>
        {slashOpen ? <SlashMenu activeIndex={activeSlashIndex} onSelect={insertCommand} /> : null}
        <EditorContent editor={null} />
      </div>
      <div className="article-editor__status" role="status">
        {status === "unsynced" ? "\u5c1a\u672a\u540c\u6b65" : null}
        {status === "conflict" ? (
          <>
            <span>REVISION_CONFLICT</span>
            <button type="button">Reload</button>
            <button type="button">Save as new draft</button>
          </>
        ) : null}
      </div>
      <button disabled={isSaving} type="button">
        Publish
      </button>
      <script data-testid="article-json" type="application/json">
        {serializedValue}
      </script>
      {contentFieldName ? <input name={contentFieldName} type="hidden" value={serializedValue} /> : null}
    </section>
  );
}
