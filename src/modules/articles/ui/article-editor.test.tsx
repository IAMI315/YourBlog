// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArticleEditor } from "./article-editor";
import type { AutosaveResult, AutosaveSaveInput } from "./use-autosave";

const codeBlockLabel = "\u4ee3\u7801\u5757";
const unsyncedStatus = "\u5c1a\u672a\u540c\u6b65";
const editorLabel = "文章内容";

const initialValue = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ArticleEditor", () => {
  it("opens a keyboard-navigable slash menu and inserts a code block", async () => {
    render(<ArticleEditor articleId="draft-1" initialRevision={1} initialValue={initialValue} />);
    const editor = screen.getByRole("textbox", { name: editorLabel });

    fireEvent.focus(editor);
    fireEvent.keyDown(editor, { key: "/" });

    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.keyDown(editor, { key: "ArrowDown" });
    fireEvent.keyDown(editor, { key: "ArrowDown" });
    fireEvent.keyDown(editor, { key: "ArrowDown" });
    fireEvent.keyDown(editor, { key: "ArrowDown" });
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(screen.getByRole("button", { name: codeBlockLabel }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByTestId("article-json").textContent).toContain("codeBlock");
  });

  it("autosaves 1.5 seconds after the last edit and disables publish while saving", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue({ ok: true, revision: 2 });
    render(
      <ArticleEditor
        articleId="draft-1"
        initialRevision={1}
        initialValue={initialValue}
        save={save}
      />,
    );
    const editor = screen.getByRole("textbox", { name: editorLabel });

    editor.textContent = "hello updated";
    fireEvent.input(editor);
    expect(screen.getByRole("button", { name: "发布" })).toHaveProperty("disabled", true);
    act(() => vi.advanceTimersByTime(1499));
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(save).toHaveBeenCalledOnce();
  });

  it("retains local JSON and shows an unsynced state when autosave fails offline", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockRejectedValue(new Error("offline"));
    render(
      <ArticleEditor
        articleId="draft-1"
        initialRevision={1}
        initialValue={initialValue}
        save={save}
      />,
    );
    const editor = screen.getByRole("textbox", { name: editorLabel });

    editor.textContent = "hello local";
    fireEvent.input(editor);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(save).toHaveBeenCalledOnce();
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(unsyncedStatus)).toBeTruthy();
    expect(screen.getByTestId("article-json").textContent).toContain("hello local");
  });

  it("keeps local content and offers conflict actions when the revision is stale", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue({ ok: false, code: "REVISION_CONFLICT" });
    render(
      <ArticleEditor
        articleId="draft-1"
        initialRevision={1}
        initialValue={initialValue}
        save={save}
      />,
    );
    const editor = screen.getByRole("textbox", { name: editorLabel });

    editor.textContent = "conflicting local edit";
    fireEvent.input(editor);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("修订冲突")).toBeTruthy();
    expect(screen.getByRole("button", { name: "重新加载" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "另存为新草稿" })).toBeTruthy();
    expect(screen.getByTestId("article-json").textContent).toContain("conflicting local edit");
  });

  it("serializes in-flight autosaves and replays the latest content with the new revision", async () => {
    vi.useFakeTimers();
    const pendingSaves: Array<(result: { ok: true; revision: number }) => void> = [];
    const save = vi.fn(
      (input: AutosaveSaveInput): Promise<AutosaveResult> => {
        void input;

        return new Promise<AutosaveResult>((resolve) => {
          pendingSaves.push(resolve);
        });
      },
    );
    render(
      <ArticleEditor
        articleId="draft-1"
        initialRevision={1}
        initialValue={initialValue}
        save={save}
      />,
    );
    const editor = screen.getByRole("textbox", { name: editorLabel });

    editor.textContent = "first edit";
    fireEvent.input(editor);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0]?.[0].expectedRevision).toBe(1);

    editor.textContent = "latest edit";
    fireEvent.input(editor);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(save).toHaveBeenCalledOnce();

    await act(async () => {
      pendingSaves[0]?.({ ok: true, revision: 2 });
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.[0].expectedRevision).toBe(2);
    expect(JSON.stringify(save.mock.calls[1]?.[0].value)).toContain("latest edit");
  });
});
