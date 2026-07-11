import type { ReactNode } from "react";

type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: TipTapNode[];
};

type TipTapPreviewProps = {
  content: Record<string, unknown>;
};

function stringAttr(attrs: Record<string, unknown> | undefined, key: string): string {
  const value = attrs?.[key];

  return typeof value === "string" ? value : "";
}

function renderInline(node: TipTapNode, key: string): ReactNode {
  let rendered: ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") rendered = <strong key={`${key}-bold`}>{rendered}</strong>;
    if (mark.type === "italic") rendered = <em key={`${key}-italic`}>{rendered}</em>;
    if (mark.type === "code") rendered = <code key={`${key}-code`}>{rendered}</code>;
    if (mark.type === "link") {
      const href = stringAttr(mark.attrs, "href") || "#";
      rendered = (
        <a key={`${key}-link`} href={href}>
          {rendered}
        </a>
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
  if (node.type === "codeBlock") return <pre key={key}>{children}</pre>;
  if (node.type === "horizontalRule") return <hr key={key} />;
  if (node.type === "image") {
    const src = stringAttr(node.attrs, "src");
    const alt = stringAttr(node.attrs, "alt");

    return src ? (
      // eslint-disable-next-line @next/next/no-img-element -- Rich text preview renders user-provided arbitrary image URLs.
      <img key={key} alt={alt} src={src} />
    ) : (
      <div key={key}>图片占位</div>
    );
  }
  if (node.type === "callout") return <aside key={key}>{children}</aside>;
  if (node.type === "table") return <table key={key}><tbody>{children}</tbody></table>;
  if (node.type === "tableRow") return <tr key={key}>{children}</tr>;
  if (node.type === "tableCell" || node.type === "tableHeader") return <td key={key}>{children}</td>;
  if (node.type === "video") {
    const src = stringAttr(node.attrs, "src");

    return src ? (
      <video key={key} controls src={src}>
        <track kind="captions" />
      </video>
    ) : (
      <div key={key}>视频占位</div>
    );
  }

  return <p key={key}>{children}</p>;
}

export function TipTapPreview({ content }: TipTapPreviewProps) {
  const nodes = Array.isArray(content.content) ? (content.content as TipTapNode[]) : [];

  return <>{nodes.map((node, index) => renderNode(node, `preview-${index}`))}</>;
}
