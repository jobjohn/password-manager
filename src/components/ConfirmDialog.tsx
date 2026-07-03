interface Props {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  message,
  confirmLabel = "削除",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xs rounded bg-white p-4 shadow-lg dark:bg-neutral-800">
        <p className="text-sm text-neutral-800 dark:text-neutral-200">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
