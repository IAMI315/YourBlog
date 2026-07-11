// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArticleEditor } from "./article-editor";

const codeBlockLabel = "\u4ee3\u7801\u5757";
const unsyncedStatus = "\u5c1a\u672a\u540c\u6b65";

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
    const editor = screen.getByRole("textbox", { name: "Article content" });

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
    const editor = screen.getByRole("textbox", { name: "Article content" });

    editor.textContent = "hello updated";
    fireEvent.input(editor);
    expect(screen.getByRole("button", { name: "Publish" })).toHaveProperty("disabled", true);
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
    const editor = screen.getByRole("textbox", { name: "Article content" });

    editor.textContent = "hello local";
    fireEvent.input(editor);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(screen.getByText(unsyncedStatus)).toBeTruthy();
    expect(screen.getByTestId("article-json").textContent).toContain("hello local");
  });
});
