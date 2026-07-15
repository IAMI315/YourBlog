"use client";

import { Trash2 } from "lucide-react";

type DeletePageButtonProps = {
  action: () => Promise<void>;
};

export function DeletePageButton({ action }: DeletePageButtonProps) {
  return (
    <button
      className="button button--danger"
      formAction={action}
      onClick={(event) => {
        if (!window.confirm("确定删除这个页面吗？页面正文会被删除，但媒体库文件会保留。")) event.preventDefault();
      }}
      type="submit"
    >
      <Trash2 size={17} /><span>删除页面</span>
    </button>
  );
}
