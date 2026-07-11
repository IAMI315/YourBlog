"use client";

import { Trash2 } from "lucide-react";

type ConfirmRecycleButtonProps = {
  action: () => Promise<void>;
};

export function ConfirmRecycleButton({ action }: ConfirmRecycleButtonProps) {
  return (
    <button
      className="button button--danger"
      formAction={action}
      onClick={(event) => {
        if (!window.confirm("确认移入回收站？")) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      <Trash2 size={16} />
      <span>移入回收站</span>
    </button>
  );
}
