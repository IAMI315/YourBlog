"use client";

import { Trash2 } from "lucide-react";

type RecycleArticleButtonProps = {
  action: () => Promise<void>;
};

export function RecycleArticleButton({ action }: RecycleArticleButtonProps) {
  return (
    <form action={action}>
      <button
        aria-label="回收"
        onClick={(event) => {
          if (!window.confirm("确认移入回收站？")) {
            event.preventDefault();
          }
        }}
        type="submit"
      >
        <Trash2 size={16} />
      </button>
    </form>
  );
}
