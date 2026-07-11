"use client";

export type SlashCommand = {
  id: string;
  label: string;
  type: string;
};

export const slashCommands: SlashCommand[] = [
  { id: "paragraph", label: "Paragraph", type: "paragraph" },
  { id: "heading", label: "Heading", type: "heading" },
  { id: "list", label: "List", type: "bulletList" },
  { id: "quote", label: "Quote", type: "blockquote" },
  { id: "code", label: "\u4ee3\u7801\u5757", type: "codeBlock" },
  { id: "image", label: "Image", type: "image" },
  { id: "callout", label: "Callout", type: "callout" },
  { id: "table", label: "Table", type: "table" },
  { id: "divider", label: "Divider", type: "horizontalRule" },
  { id: "link", label: "Link", type: "link" },
  { id: "video", label: "Video", type: "video" },
];

type SlashMenuProps = {
  activeIndex: number;
  onSelect(command: SlashCommand): void;
};

export function SlashMenu({ activeIndex, onSelect }: SlashMenuProps) {
  return (
    <div className="slash-menu" role="menu" aria-label="Block menu">
      {slashCommands.map((command, index) => (
        <button
          data-active={index === activeIndex}
          key={command.id}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(command);
          }}
          role="menuitem"
          type="button"
        >
          {command.label}
        </button>
      ))}
    </div>
  );
}
