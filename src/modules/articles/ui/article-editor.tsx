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
  showPublishButton?: boolean;
  saveAsNewDraftAction?: (input: {
    articleId: string;
    value: Record<string, unknown>;
  }) => Promise<{ id: string }>;
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
  if (command.type === "heading") return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "标题" }] };
  if (command.type === "bulletList") {
    return { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] };
  }
  if (command.type === "blockquote") return { type: "blockquote", content: [{ type: "paragraph" }] };
  if (command.type === "image") return { type: "image", attrs: { src: "", alt: "" } };
  if (command.type === "callout") return { type: "callout", content: [{ type: "text", text: "提示内容" }] };
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
  if (command.type === "link") return { type: "paragraph", content: [{ type: "text", marks: [{ type: "link", attrs: { href: "https://example.com" } }], text: "链接" }] };
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
  saveAsNewDraftAction,
  save,
  showPublishButton = true,
}: ArticleEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [activeType, setActiveType] = useState("paragraph");
  const [slashOpen, setSlashOpen] = useState(false);
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const [isSavingConflictDraft, setIsSavingConflictDraft] = useState(false);
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
        "aria-label": "文章内容",
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
      <div className="article-editor__drag-actions" aria-label="块排序">
        <button onClick={() => reorder(-1)} type="button">
          上移块
        </button>
        <button onClick={() => reorder(1)} type="button">
          下移块
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
            <span>修订冲突</span>
            <button onClick={() => window.location.reload()} type="button">
              重新加载
            </button>
            <button
              disabled={!saveAsNewDraftAction || isSavingConflictDraft}
              onClick={async () => {
                if (!saveAsNewDraftAction) return;
                setIsSavingConflictDraft(true);
                const result = await saveAsNewDraftAction({ articleId, value });
                window.location.assign(`/admin/articles/${result.id}`);
              }}
              type="button"
            >
              另存为新草稿
            </button>
          </>
        ) : null}
      </div>
      {showPublishButton && publishAction ? (
        <button className="button" disabled={isSaving} formAction={publishAction} type="submit">
          发布
        </button>
      ) : showPublishButton ? (
        <button className="button" disabled={isSaving} type="button">
          发布
        </button>
      ) : null}
      <script data-testid="article-json" type="application/json">
        {serializedValue}
      </script>
      {contentFieldName ? <input name={contentFieldName} type="hidden" value={serializedValue} /> : null}
      <input name="expectedRevision" type="hidden" value={currentRevision} />
    </section>
  );
}
