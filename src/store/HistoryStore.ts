import { create } from "zustand";
import type { SerializedEffect } from "@/types";

interface HistoryEntry {
  id: string;
  timestamp: number;
  label: string;
  snapshot: SerializedEffect[];
}

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number;

  pushState: (label: string, snapshot: SerializedEffect[]) => void;
  undo: () => SerializedEffect[] | null;
  redo: () => SerializedEffect[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxSize: 100,

  pushState: (label, snapshot) =>
    set((state) => {
      const entry: HistoryEntry = {
        id: `h_${crypto.randomUUID()}`,
        timestamp: Date.now(),
        label,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
      };

      const past = [...state.past, entry];
      if (past.length > state.maxSize) {
        past.shift();
      }

      return { past, future: [] };
    }),

  undo: () => {
    const state = get();
    if (state.past.length === 0) return null;

    const past = [...state.past];
    const entry = past.pop()!;

    set({
      past,
      future: [entry, ...state.future],
    });

    // Return the previous state's snapshot
    if (past.length > 0) {
      return past[past.length - 1].snapshot;
    }
    return [];
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return null;

    const future = [...state.future];
    const entry = future.shift()!;

    set({
      past: [...state.past, entry],
      future,
    });

    return entry.snapshot;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}));
