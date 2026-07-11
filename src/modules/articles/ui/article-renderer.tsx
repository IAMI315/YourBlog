import type { ReactNode } from "react";

type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: TipTapNode[];
};

type ArticleRendererProps = {
  content: Record<string, unknown>;
};

function stringAttr(attrs: Record<string, unknown> | undefined, key: string): string {
  const value = attrs?.[key];

  return typeof value === "string" ? value : "";
}

export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const parsed = new URL(value, "https://example.local");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

function renderInline(node: TipTapNode, key: string): ReactNode {
  let rendered: ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") rendered = <strong key={`${key}-bold`}>{rendered}</strong>;
    if (mark.type === "italic") rendered = <em key={`${key}-italic`}>{rendered}</em>;
    if (mark.type === "code") rendered = <code key={`${key}-code`}>{rendered}</code>;
    if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      rendered = href ? (
        <a key={`${key}-link`} href={href}>
          {rendered}
        </a>
      ) : (
        <span key={`${key}-unsafe-link`}>{rendered}</span>
      );
    }
  }

  return rendered;
}

function renderChildren(nodes: TipTapNode[] | undefined, keyPrefix: string): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, `${keyPrefix}-${index}`));
}

function renderNode(node: TipTapNode, key: string): ReactNode {
  if (node.type === "text") return renderInline(node, key);

  const children = renderChildren(node.content, key);

  if (node.type === "heading") {
    const level = Number(node.attrs?.level);
    if (level === 1) return <h1 key={key}>{children}</h1>;
    if (level === 3) return <h3 key={key}>{children}</h3>;
    return <h2 key={key}>{children}</h2>;
  }
  if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
  if (node.type === "orderedList") return <ol key={key}>{children}</ol>;
  if (node.type === "listItem") return <li key={key}>{children}</li>;
  if (node.type === "blockquote") return <blockquote key={key}>{children}</blockquote>;
  if (node.type === "codeBlock") return <pre key={key}><code>{children}</code></pre>;
  if (node.type === "horizontalRule") return <hr key={key} />;
  if (node.type === "image") {
    const src = safeHref(node.attrs?.src);
    const alt = stringAttr(node.attrs, "alt");

    return src ? (
      // eslint-disable-next-line @next/next/no-img-element -- Renderer outputs editor-authored media and external tutorial images.
      <img key={key} alt={alt} src={src} />
    ) : null;
  }
  if (node.type === "callout") return <aside className="article-callout" key={key}>{children}</aside>;
  if (node.type === "table") return <div className="article-table-scroll" key={key}><table><tbody>{children}</tbody></table></div>;
  if (node.type === "tableRow") return <tr key={key}>{children}</tr>;
  if (node.type === "tableHeader") return <th key={key}>{children}</th>;
  if (node.type === "tableCell") return <td key={key}>{children}</td>;
  if (node.type === "video") {
    const src = safeHref(node.attrs?.src);

    return src ? (
      <video controls key={key} src={src}>
        <track kind="captions" />
      </video>
    ) : null;
  }

  return <p key={key}>{children}</p>;
}

export function ArticleRenderer({ content }: ArticleRendererProps) {
  const nodes = Array.isArray(content.content) ? (content.content as TipTapNode[]) : [];

  return <div className="article-renderer">{nodes.map((node, index) => renderNode(node, `article-${index}`))}</div>;
}
