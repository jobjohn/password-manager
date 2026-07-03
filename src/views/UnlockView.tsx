import { useState, type FormEvent } from "react";
import { useSessionStore } from "../state/useSessionStore";

export function UnlockView() {
  const unlock = useSessionStore((s) => s.unlock);
  const error = useSessionStore((s) => s.error);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await unlock(password);
    } catch {
      // error message is already captured in the store
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        マスターパスワードを入力してください
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
        <button
          type="submit"
          disabled={isSubmitting || password.length === 0}
          className="rounded bg-neutral-900 px-2 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          ロック解除
        </button>
      </form>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
