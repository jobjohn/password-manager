import { create } from "zustand";
import * as commands from "../lib/tauriCommands";
import type { EntryInput, EntrySummary } from "../types/vault";

interface VaultState {
  entries: EntrySummary[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTag: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  refresh: () => Promise<void>;
  addEntry: (input: EntryInput) => Promise<EntrySummary>;
  updateEntry: (id: string, input: EntryInput) => Promise<EntrySummary>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set) => ({
  entries: [],
  isLoading: false,
  error: null,
  searchQuery: "",
  selectedTag: null,

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedTag: (tag: string | null) => set({ selectedTag: tag }),

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await commands.listEntries();
      set({ entries, isLoading: false });
    } catch {
      set({ isLoading: false, error: "エントリの取得に失敗しました" });
    }
  },

  addEntry: async (input: EntryInput) => {
    const summary = await commands.addEntry(input);
    set((s) => ({ entries: [...s.entries, summary] }));
    return summary;
  },

  updateEntry: async (id: string, input: EntryInput) => {
    const summary = await commands.updateEntry(id, input);
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? summary : e)),
    }));
    return summary;
  },

  deleteEntry: async (id: string) => {
    await commands.deleteEntry(id);
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },
}));
