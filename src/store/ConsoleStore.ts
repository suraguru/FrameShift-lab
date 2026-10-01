import { create } from "zustand";
import type { ConsoleEntry, ConsoleLevel } from "@/types";

interface ConsoleState {
  entries: ConsoleEntry[];
  maxEntries: number;
  filter: ConsoleLevel | "all";

  addEntry: (level: ConsoleLevel, message: string, source?: string) => void;
  addBatch: (entries: ConsoleEntry[]) => void;
  clear: () => void;
  setFilter: (filter: ConsoleLevel | "all") => void;
  getFiltered: () => ConsoleEntry[];
}

export const useConsoleStore = create<ConsoleState>((set, get) => ({
  entries: [],
  maxEntries: 500,
  filter: "all",

  addEntry: (level, message, source) =>
    set((state) => {
      const entry: ConsoleEntry = {
        id: `c_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`,
        timestamp: Date.now(),
        level,
        message,
        source,
      };
      const entries = [...state.entries, entry];
      if (entries.length > state.maxEntries) {
        entries.splice(0, entries.length - state.maxEntries);
      }
      return { entries };
    }),

  addBatch: (newEntries) =>
    set((state) => {
      const entries = [...state.entries, ...newEntries];
      if (entries.length > state.maxEntries) {
        entries.splice(0, entries.length - state.maxEntries);
      }
      return { entries };
    }),

  clear: () => set({ entries: [] }),

  setFilter: (filter) => set({ filter }),

  getFiltered: () => {
    const state = get();
    if (state.filter === "all") return state.entries;
    return state.entries.filter((e) => e.level === state.filter);
  },
}));
