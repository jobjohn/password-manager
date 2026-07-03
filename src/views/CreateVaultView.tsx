import { useState, type FormEvent } from "react";
import { useSessionStore } from "../state/useSessionStore";

export function CreateVaultView() {
  const createVault = useSessionStore((s) => s.createVault);
  const error = useSessionStore((s) => s.error);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length > 0 && !mismatch && !isSubmitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await createVault(password);
    } catch {
      // error message is already captured in the store
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        新しいvaultを作成します
      </p>
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        マスターパスワードを忘れると保管庫は復元できません
      </p>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          placeholder="マスターパスワード"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          placeholder="確認用に再入力"
        />
        {mismatch && (
          <p className="text-xs text-red-600 dark:text-red-400">パスワードが一致しません</p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-neutral-900 px-2 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          vaultを作成
        </button>
      </form>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
