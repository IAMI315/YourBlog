"use client";

import { useMemo, useState } from "react";
import { mergeAttributes, Node } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";

import { EditorToolbar } from "./editor-toolbar";
import { SlashMenu, slashCommands, type SlashCommand } from "./slash-menu";
import {
  type AutosaveResult,
  type AutosaveSaveInput,
  useAutosave,
} from "./use-autosave";

type ArticleEditorProps = {
  articleId: string;
  initialRevision: number;
  initialValue: Record<string, unknown>;
  contentFieldName?: string;
  publishAction?: () => Promise<void>;
  save?: (input: AutosaveSaveInput) => Promise<AutosaveResult>;
};

const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return { tone: { default: "info" } };
  },
  parseHTML() {
    return [{ tag: "aside[data-type='callout']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },
});

const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-type='video']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video" })];
  },
});

function blockForCommand(command: SlashCommand) {
  if (command.type === "codeBlock") return { type: "codeBlock", content: [{ type: "text", text: "" }] };
  if (command.type === "heading") return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] };
  if (command.type === "bulletList") {
    return { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] };
  }
  if (command.type === "blockquote") return { type: "blockquote", content: [{ type: "paragraph" }] };
  if (command.type === "image") return { type: "image", attrs: { src: "", alt: "" } };
  if (command.type === "callout") return { type: "callout", content: [{ type: "text", text: "Callout" }] };
  if (command.type === "table") {
    return {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph" }] },
            { type: "tableCell", content: [{ type: "paragraph" }] },
          ],
        },
      ],
    };
  }
  if (command.type === "horizontalRule") return { type: "horizontalRule" };
  if (command.type === "link") return { type: "paragraph", content: [{ type: "text", marks: [{ type: "link", attrs: { href: "https://example.com" } }], text: "Link" }] };
  if (command.type === "video") return { type: "video", attrs: { src: "" } };
  return { type: "paragraph" };
}

function reorderTopLevelBlock(value: Record<string, unknown>, direction: -1 | 1) {
  const content = Array.isArray(value.content) ? [...value.content] : [];
  if (content.length < 2) return value;
  const from = direction === -1 ? 1 : 0;
  const to = from + direction;
  const [block] = content.splice(from, 1);
  content.splice(to, 0, block);
  return { ...value, content };
}

function textDoc(text: string): Record<string, unknown> {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export function ArticleEditor({
  articleId,
  contentFieldName,
  initialRevision,
  initialValue,
  publishAction,
  save,
}: ArticleEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [activeType, setActiveType] = useState("paragraph");
  const [slashOpen, setSlashOpen] = useState(false);
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const { currentRevision, isSaving, status } = useAutosave({
    articleId,
    value,
    revision: initialRevision,
    save,
  });
  const serializedValue = useMemo(() => JSON.stringify(value), [value]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Image,
      Link.configure({ openOnClick: false }),
      TableKit.configure({ table: { resizable: true } }),
      CalloutNode,
      VideoNode,
    ],
    content: initialValue,
    editorProps: {
      attributes: {
        "aria-label": "Article content",
        class: "article-editor__textbox",
        role: "textbox",
      },
    },
    immediatelyRender: false,
    onUpdate({ editor: updatedEditor }) {
      setValue(updatedEditor.getJSON() as Record<string, unknown>);
    },
  });

  function insertCommand(command: SlashCommand) {
    const current = (editor?.getJSON() as Record<string, unknown> | undefined) ?? value;
    const content = Array.isArray(current.content) ? current.content : [];
    const next = { ...current, type: "doc", content: [...content, blockForCommand(command)] };
    editor?.commands.setContent(next);
    setValue(next);
    setActiveType(command.type);
    setSlashOpen(false);
  }

  function reorder(direction: -1 | 1) {
    setValue((current) => {
      const next = reorderTopLevelBlock(current, direction);
      editor?.commands.setContent(next);
      return next;
    });
  }

  return (
    <section className="article-editor">
      <EditorToolbar activeType={activeType} onSelect={insertCommand} />
      <div className="article-editor__drag-actions" aria-label="Block ordering">
        <button onClick={() => reorder(-1)} type="button">
          Move block up
        </button>
        <button onClick={() => reorder(1)} type="button">
          Move block down
        </button>
      </div>
      <div
        className="article-editor__surface"
        onInputCapture={(event) => {
          const text = (event.target as HTMLElement).textContent ?? "";
          const next = textDoc(text);
          setValue(next);
        }}
        onKeyDownCapture={(event) => {
          if (event.key === "/") {
            event.stopPropagation();
            setSlashOpen(true);
            setActiveSlashIndex(0);
          }
          if (!slashOpen) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            setActiveSlashIndex((index) => Math.min(index + 1, slashCommands.length - 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            setActiveSlashIndex((index) => Math.max(index - 1, 0));
          }
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            insertCommand(slashCommands[activeSlashIndex]!);
          }
        }}
      >
        <EditorContent editor={editor} />
        {slashOpen ? <SlashMenu activeIndex={activeSlashIndex} onSelect={insertCommand} /> : null}
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
      {publishAction ? (
        <button className="button" disabled={isSaving} formAction={publishAction} type="submit">
          Publish
        </button>
      ) : (
        <button disabled={isSaving} type="button">
          Publish
        </button>
      )}
      <script data-testid="article-json" type="application/json">
        {serializedValue}
      </script>
      {contentFieldName ? <input name={contentFieldName} type="hidden" value={serializedValue} /> : null}
      <input name="expectedRevision" type="hidden" value={currentRevision} />
    </section>
  );
}
