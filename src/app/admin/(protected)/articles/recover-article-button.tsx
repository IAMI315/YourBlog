"use client";

import { RotateCcw } from "lucide-react";

type RecoverArticleButtonProps = {
  action: () => Promise<void>;
};

export function RecoverArticleButton({ action }: RecoverArticleButtonProps) {
  return (
    <form action={action}>
      <button
        aria-label="恢复"
        onClick={(event) => {
          if (!window.confirm("确认恢复这篇文章？")) {
            event.preventDefault();
          }
        }}
        type="submit"
      >
        <RotateCcw size={16} />
      </button>
    </form>
  );
}
