import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { useSessionStore } from "./state/useSessionStore";
import { useNavStore } from "./state/useNavStore";
import { useSettingsStore } from "./state/useSettingsStore";
import { reportActivity } from "./lib/tauriCommands";
import { UnlockView } from "./views/UnlockView";
import { CreateVaultView } from "./views/CreateVaultView";
import { VaultListView } from "./views/VaultListView";
import { EntryDetailView } from "./views/EntryDetailView";
import { EntryEditView } from "./views/EntryEditView";
import { SettingsView } from "./views/SettingsView";

const ACTIVITY_PING_THROTTLE_MS = 30_000;

function App() {
  const status = useSessionStore((s) => s.status);
  const refresh = useSessionStore((s) => s.refresh);
  const lock = useSessionStore((s) => s.lock);
  const setLocked = useSessionStore((s) => s.setLocked);
  const view = useNavStore((s) => s.view);
  const back = useNavStore((s) => s.back);
  const push = useNavStore((s) => s.push);
  const resetNav = useNavStore((s) => s.reset);
  const initSettings = useSettingsStore((s) => s.init);

  useEffect(() => {
    void refresh();
    void initSettings();
  }, [refresh, initSettings]);

  useEffect(() => {
    if (status === "unlocked") {
      resetNav({ name: "list" });
    }
  }, [status, resetNav]);

  // The backend can lock the vault on its own (inactivity timeout, tray
  // "lock now", closing to tray) — reflect that here instead of polling.
  useEffect(() => {
    const unlistenPromise = listen("vault-locked", () => {
      setLocked();
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [setLocked]);

  // Throttled activity ping so the backend's inactivity timer doesn't fire
  // while the user is actively interacting with the window.
  useEffect(() => {
    let lastPing = 0;
    function handleActivity() {
      const now = Date.now();
      if (now - lastPing < ACTIVITY_PING_THROTTLE_MS) return;
      lastPing = now;
      void reportActivity();
    }
    window.addEventListener("pointerdown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    return () => {
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          {status === "unlocked" && view.name !== "list" && (
            <button
              type="button"
              onClick={() => back()}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              ←
            </button>
          )}
          <span className="text-sm font-semibold">Password Manager</span>
        </div>
        {status === "unlocked" && (
          <div className="flex items-center gap-3">
            {view.name !== "settings" && (
              <button
                type="button"
                onClick={() => push({ name: "settings" })}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                設定
              </button>
            )}
            <button
              type="button"
              onClick={() => void lock()}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              ロック
            </button>
          </div>
        )}
      </header>
      <main className="flex flex-1 flex-col overflow-hidden">
        {status === "checking" && (
          <p className="m-auto text-sm text-neutral-400 dark:text-neutral-500">読み込み中…</p>
        )}
        {status === "no-vault" && <CreateVaultView />}
        {status === "locked" && <UnlockView />}
        {status === "unlocked" && view.name === "list" && <VaultListView />}
        {status === "unlocked" && view.name === "entry-detail" && (
          <EntryDetailView entryId={view.entryId} />
        )}
        {status === "unlocked" && view.name === "entry-edit" && (
          <EntryEditView entryId={view.entryId} />
        )}
        {status === "unlocked" && view.name === "settings" && (
          <SettingsView />
        )}
      </main>
    </div>
  );
}

export default App;
