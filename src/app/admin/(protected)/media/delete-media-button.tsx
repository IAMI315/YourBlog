"use client";

import { Trash2 } from "lucide-react";

type DeleteMediaButtonProps = {
  action: () => Promise<void>;
  disabled?: boolean;
};

export function DeleteMediaButton({ action, disabled }: DeleteMediaButtonProps) {
  return (
    <button
      className="button button--danger"
      disabled={disabled}
      formAction={action}
      onClick={(event) => {
        if (!window.confirm("确认删除这个未使用的媒体文件？")) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      <Trash2 size={16} />
      <span>删除</span>
    </button>
  );
}
