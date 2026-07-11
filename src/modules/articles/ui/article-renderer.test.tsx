import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArticleRenderer } from "./article-renderer";

describe("ArticleRenderer", () => {
  it("preserves UTF-8 text in code blocks", () => {
    const html = renderToStaticMarkup(
      <ArticleRenderer
        content={{
          type: "doc",
          content: [{ type: "codeBlock", content: [{ type: "text", text: "console.log('自托管教程')" }] }],
        }}
      />,
    );

    expect(html).toContain("console.log(&#x27;自托管教程&#x27;)");
    expect(html).toContain("<pre>");
  });

  it("does not render unsafe link protocols", () => {
    const html = renderToStaticMarkup(
      <ArticleRenderer
        content={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "click me",
                  marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(html).toContain("click me");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<a ");
  });

  it("renders safe HTTPS links", () => {
    const html = renderToStaticMarkup(
      <ArticleRenderer
        content={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "docs",
                  marks: [{ type: "link", attrs: { href: "https://example.com/docs" } }],
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(html).toContain('href="https://example.com/docs"');
  });

  it("drops unsafe image sources and renders table headers semantically", () => {
    const html = renderToStaticMarkup(
      <ArticleRenderer
        content={{
          type: "doc",
          content: [
            { type: "image", attrs: { src: "javascript:alert(1)", alt: "bad" } },
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "列" }] }] }],
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
    expect(html).toContain("<th>");
  });
});
