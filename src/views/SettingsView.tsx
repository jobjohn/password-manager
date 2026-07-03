import { useEffect, useState, type FormEvent } from "react";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import * as commands from "../lib/tauriCommands";
import type { Settings } from "../types/settings";
import { useSessionStore } from "../state/useSessionStore";
import { useSettingsStore } from "../state/useSettingsStore";

export function SettingsView() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [ioMessage, setIoMessage] = useState<string | null>(null);
  const [autostartOn, setAutostartOn] = useState(false);
  const changeMasterPassword = useSessionStore((s) => s.changeMasterPassword);
  const setLocked = useSessionStore((s) => s.setLocked);

  useEffect(() => {
    void isEnabled().then(setAutostartOn);
  }, []);

  async function applySettings(next: Settings) {
    await updateSettings(next);
  }

  async function handleToggleAutostart(checked: boolean) {
    // The OS-level registration is the source of truth — we don't persist
    // this in our own settings store.
    if (checked) {
      await enable();
    } else {
      await disable();
    }
    setAutostartOn(checked);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    try {
      await changeMasterPassword(currentPassword, newPassword);
      setPasswordMessage("マスターパスワードを変更しました");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPasswordMessage(
        "変更に失敗しました。現在のパスワードを確認してください",
      );
    }
  }

  async function handleExport() {
    const exported = await commands.exportVaultEncrypted();
    setIoMessage(exported ? "エクスポートしました" : null);
  }

  async function handleImport() {
    const imported = await commands.importVaultEncrypted();
    if (imported) {
      // Importing swaps the vault file out from under the current session —
      // the backend already locked it; reflect that here.
      setLocked();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          表示
        </p>
        <label className="flex items-center justify-between text-sm">
          テーマ
          <select
            value={settings.theme}
            onChange={(e) =>
              void applySettings({
                ...settings,
                theme: e.target.value as Settings["theme"],
              })
            }
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="system">システムに合わせる</option>
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
        </label>
        <label className="flex items-center justify-between text-sm">
          常に最前面に表示
          <input
            type="checkbox"
            checked={settings.alwaysOnTop}
            onChange={(e) =>
              void applySettings({
                ...settings,
                alwaysOnTop: e.target.checked,
              })
            }
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          ログイン時に自動起動(常にロック状態で起動)
          <input
            type="checkbox"
            checked={autostartOn}
            onChange={(e) => void handleToggleAutostart(e.target.checked)}
          />
        </label>
      </section>

      <section className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          マスターパスワード変更
        </p>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-2">
          <input
            type="password"
            placeholder="現在のパスワード"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <input
            type="password"
            placeholder="新しいパスワード"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            type="submit"
            disabled={currentPassword.length === 0 || newPassword.length === 0}
            className="rounded bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            変更する
          </button>
          {passwordMessage && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {passwordMessage}
            </p>
          )}
        </form>
      </section>

      <section className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          バックアップ
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium dark:border-neutral-600"
          >
            エクスポート
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium dark:border-neutral-600"
          >
            インポート
          </button>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          インポートは既存のvaultを丸ごと置き換えます(エントリの統合はできません)。
        </p>
        {ioMessage && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {ioMessage}
          </p>
        )}
      </section>
    </div>
  );
}
