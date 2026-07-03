import { useEffect, useState, type FormEvent } from "react";
import * as commands from "../lib/tauriCommands";
import type { EntryInput } from "../types/vault";
import { useNavStore } from "../state/useNavStore";
import { useVaultStore } from "../state/useVaultStore";
import { GeneratorView } from "./GeneratorView";

interface Props {
  entryId: string | null;
}

const emptyInput: EntryInput = {
  title: "",
  username: "",
  password: "",
  url: "",
  notes: "",
  tags: [],
};

export function EntryEditView({ entryId }: Props) {
  const [input, setInput] = useState<EntryInput>(emptyInput);
  const [tagsText, setTagsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const back = useNavStore((s) => s.back);
  const addEntry = useVaultStore((s) => s.addEntry);
  const updateEntry = useVaultStore((s) => s.updateEntry);

  useEffect(() => {
    if (entryId === null) return;
    void commands.getEntry(entryId).then((entry) => {
      setInput({
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url,
        notes: entry.notes,
        tags: entry.tags,
      });
      setTagsText(entry.tags.join(", "));
    });
  }, [entryId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.title.trim().length === 0) return;
    setIsSaving(true);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const payload: EntryInput = { ...input, tags };
    try {
      if (entryId === null) {
        await addEntry(payload);
      } else {
        await updateEntry(entryId, payload);
      }
      back();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-2 overflow-y-auto p-3"
    >
      <label className="flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        タイトル
        <input
          value={input.title}
          onChange={(e) => setInput({ ...input, title: e.target.value })}
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        ユーザー名
        <input
          value={input.username}
          onChange={(e) => setInput({ ...input, username: e.target.value })}
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        パスワード
        <div className="flex gap-1">
          <input
            value={input.password}
            onChange={(e) => setInput({ ...input, password: e.target.value })}
            className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            type="button"
            onClick={() => setShowGenerator(true)}
            className="shrink-0 rounded border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
          >
            生成
          </button>
        </div>
      </label>
      <label className="flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        URL
        <input
          value={input.url}
          onChange={(e) => setInput({ ...input, url: e.target.value })}
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        メモ
        <textarea
          value={input.notes}
          onChange={(e) => setInput({ ...input, notes: e.target.value })}
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          rows={3}
        />
      </label>
      <label className="flex flex-col gap-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        タグ(カンマ区切り)
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        />
      </label>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={() => back()}
          className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium dark:border-neutral-600"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSaving || input.title.trim().length === 0}
          className="flex-1 rounded bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          保存
        </button>
      </div>
      {showGenerator && (
        <GeneratorView
          onUse={(password) => setInput((i) => ({ ...i, password }))}
          onClose={() => setShowGenerator(false)}
        />
      )}
    </form>
  );
}
