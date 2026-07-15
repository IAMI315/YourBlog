"use client";

import { Code2, Heading1, ImageIcon, LinkIcon, List, Quote, Table2 } from "lucide-react";

import { slashCommands, type SlashCommand } from "./slash-menu";

type EditorToolbarProps = {
  activeType: string;
  onSelect(command: SlashCommand): void;
};

const iconByType: Record<string, React.ReactNode> = {
  heading: <Heading1 size={16} />,
  bulletList: <List size={16} />,
  blockquote: <Quote size={16} />,
  codeBlock: <Code2 size={16} />,
  image: <ImageIcon size={16} />,
  table: <Table2 size={16} />,
  link: <LinkIcon size={16} />,
};

export function EditorToolbar({ activeType, onSelect }: EditorToolbarProps) {
  return (
    <div className="editor-toolbar" aria-label="编辑器工具栏">
      {slashCommands.slice(0, 9).map((command) => (
        <button
          aria-label={command.label}
          aria-pressed={activeType === command.type}
          key={command.id}
          onClick={() => onSelect(command)}
          type="button"
        >
          {iconByType[command.type] ?? command.label}
        </button>
      ))}
    </div>
  );
}
