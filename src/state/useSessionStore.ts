import { create } from "zustand";
import * as commands from "../lib/tauriCommands";

export type SessionStatus = "checking" | "no-vault" | "locked" | "unlocked";

interface TauriAppError {
  kind: "Locked" | "AlreadyExists" | "NotFound" | "Crypto" | "Io";
  message?: string;
}

function isTauriAppError(error: unknown): error is TauriAppError {
  return typeof error === "object" && error !== null && "kind" in error;
}

function errorMessage(error: unknown): string {
  if (isTauriAppError(error)) {
    switch (error.kind) {
      case "Locked":
        return "保管庫がロックされています";
      case "AlreadyExists":
        return "vaultは既に存在します";
      case "NotFound":
        return "vaultが見つかりません";
      default:
        return error.message ?? "予期しないエラーが発生しました";
    }
  }
  if (typeof error === "string") return error;
  return "予期しないエラーが発生しました";
}

interface SessionState {
  status: SessionStatus;
  error: string | null;
  refresh: () => Promise<void>;
  createVault: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  /** Reflects a lock that already happened on the backend (auto-lock, tray
   * "lock now", close-to-tray) — does not call `lock_vault` again. */
  setLocked: () => void;
  changeMasterPassword: (current: string, next: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "checking",
  error: null,

  refresh: async () => {
    const exists = await commands.vaultExists();
    if (!exists) {
      set({ status: "no-vault", error: null });
      return;
    }
    const unlocked = await commands.isUnlocked();
    set({ status: unlocked ? "unlocked" : "locked", error: null });
  },

  createVault: async (password: string) => {
    try {
      await commands.createVault(password);
      set({ status: "unlocked", error: null });
    } catch (error: unknown) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },

  unlock: async (password: string) => {
    try {
      await commands.unlockVault(password);
      set({ status: "unlocked", error: null });
    } catch (error: unknown) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },

  lock: async () => {
    await commands.lockVault();
    set({ status: "locked", error: null });
  },

  setLocked: () => set({ status: "locked", error: null }),

  changeMasterPassword: async (current: string, next: string) => {
    try {
      await commands.changeMasterPassword(current, next);
      set({ error: null });
    } catch (error: unknown) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
}));
