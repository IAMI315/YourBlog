"use client";

export type SlashCommand = {
  id: string;
  label: string;
  type: string;
};

export const slashCommands: SlashCommand[] = [
  { id: "paragraph", label: "段落", type: "paragraph" },
  { id: "heading", label: "标题", type: "heading" },
  { id: "list", label: "列表", type: "bulletList" },
  { id: "quote", label: "引用", type: "blockquote" },
  { id: "code", label: "代码块", type: "codeBlock" },
  { id: "image", label: "图片", type: "image" },
  { id: "callout", label: "提示", type: "callout" },
  { id: "table", label: "表格", type: "table" },
  { id: "divider", label: "分割线", type: "horizontalRule" },
  { id: "link", label: "链接", type: "link" },
  { id: "video", label: "视频", type: "video" },
];

type SlashMenuProps = {
  activeIndex: number;
  onSelect(command: SlashCommand): void;
};

export function SlashMenu({ activeIndex, onSelect }: SlashMenuProps) {
  return (
    <div className="slash-menu" role="menu" aria-label="块菜单">
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
