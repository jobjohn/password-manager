import { create } from "zustand";

export type View =
  | { name: "list" }
  | { name: "entry-detail"; entryId: string }
  | { name: "entry-edit"; entryId: string | null }
  | { name: "settings" };

interface NavState {
  view: View;
  history: View[];
  push: (view: View) => void;
  back: () => void;
  reset: (view: View) => void;
}

export const useNavStore = create<NavState>((set) => ({
  view: { name: "list" },
  history: [],

  push: (view) =>
    set((s) => ({ history: [...s.history, s.view], view })),

  back: () =>
    set((s) => {
      const history = [...s.history];
      const previous = history.pop();
      return { history, view: previous ?? { name: "list" } };
    }),

  reset: (view) => set({ view, history: [] }),
}));
