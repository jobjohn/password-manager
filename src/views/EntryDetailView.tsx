import { useEffect, useState } from "react";
import * as commands from "../lib/tauriCommands";
import type { Entry } from "../types/vault";
import { useNavStore } from "../state/useNavStore";
import { useVaultStore } from "../state/useVaultStore";
import { ConfirmDialog } from "../components/ConfirmDialog";

interface Props {
  entryId: string;
}

export function EntryDetailView({ entryId }: Props) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const push = useNavStore((s) => s.push);
  const back = useNavStore((s) => s.back);
  const deleteEntry = useVaultStore((s) => s.deleteEntry);

  useEffect(() => {
    void commands.getEntry(entryId).then(setEntry);
  }, [entryId]);

  async function handleDelete() {
    await deleteEntry(entryId);
    setConfirmingDelete(false);
    back();
  }

  if (!entry) {
    return <p className="m-auto text-sm text-neutral-400 dark:text-neutral-500">読み込み中…</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">タイトル</p>
        <p className="text-sm">{entry.title}</p>
      </div>
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">ユーザー名</p>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm">{entry.username}</p>
          <button
            type="button"
            onClick={() =>
              void commands.copyEntryFieldToClipboard(entryId, "username")
            }
            className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            コピー
          </button>
        </div>
      </div>
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">パスワード</p>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm">
            {showPassword ? entry.password : "••••••••"}
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {showPassword ? "隠す" : "表示"}
            </button>
            <button
              type="button"
              onClick={() =>
                void commands.copyEntryFieldToClipboard(entryId, "password")
              }
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              コピー(25秒後に自動消去)
            </button>
          </div>
        </div>
      </div>
      {entry.url && (
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">URL</p>
          <p className="break-all text-sm text-blue-600 dark:text-blue-400">{entry.url}</p>
        </div>
      )}
      {entry.notes && (
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">メモ</p>
          <p className="whitespace-pre-wrap text-sm">{entry.notes}</p>
        </div>
      )}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={() => push({ name: "entry-edit", entryId })}
          className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium dark:border-neutral-600"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex-1 rounded border border-red-300 px-2 py-1.5 text-xs font-medium text-red-600 dark:border-red-800 dark:text-red-400"
        >
          削除
        </button>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          message={`「${entry.title}」を削除しますか?`}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
