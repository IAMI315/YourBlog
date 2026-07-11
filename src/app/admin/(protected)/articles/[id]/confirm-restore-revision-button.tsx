"use client";

type ConfirmRestoreRevisionButtonProps = {
  action: () => Promise<void>;
  revision: number;
};

export function ConfirmRestoreRevisionButton({
  action,
  revision,
}: ConfirmRestoreRevisionButtonProps) {
  return (
    <button
      formAction={action}
      onClick={(event) => {
        if (!window.confirm(`确认恢复到修订 #${revision}？当前草稿会被替换。`)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      恢复
    </button>
  );
}
