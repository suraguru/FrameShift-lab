import { create } from "zustand";
import type { SerializedEffect } from "@/types";

interface EffectState {
  effects: SerializedEffect[];
  selectedEffectId: string | null;
  addEffect: (effect: SerializedEffect) => void;
  removeEffect: (instanceId: string) => void;
  updateEffectParam: (
    instanceId: string,
    param: string,
    value: number | boolean | string | number[]
  ) => void;
  reorderEffects: (startIndex: number, endIndex: number) => void;
  setSelectedEffect: (instanceId: string | null) => void;
  toggleEffect: (instanceId: string) => void;
  clearEffects: () => void;
  setEffects: (effects: SerializedEffect[]) => void;
  toggleLock: (instanceId: string) => void;
  duplicateEffect: (instanceId: string) => void;
  clipboardParams: Record<string, any> | null;
  copyParams: (instanceId: string) => void;
  pasteParams: (instanceId: string) => void;
}

export const useEffectStore = create<EffectState>((set) => ({
  effects: [],
  selectedEffectId: null,
  clipboardParams: null,

  addEffect: (effect) =>
    set((state) => ({
      effects: [...state.effects, effect],
      selectedEffectId: effect.instanceId,
    })),

  removeEffect: (instanceId) =>
    set((state) => ({
      effects: state.effects.filter((e) => e.instanceId !== instanceId),
      selectedEffectId:
        state.selectedEffectId === instanceId ? null : state.selectedEffectId,
    })),

  updateEffectParam: (instanceId, param, value) =>
    set((state) => ({
      effects: state.effects.map((e) =>
        e.instanceId === instanceId
          ? { ...e, parameters: { ...e.parameters, [param]: value } }
          : e
      ),
    })),

  reorderEffects: (startIndex, endIndex) =>
    set((state) => {
      const result = [...state.effects];
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { effects: result };
    }),

  setSelectedEffect: (instanceId) => set({ selectedEffectId: instanceId }),

  toggleEffect: (instanceId) =>
    set((state) => ({
      effects: state.effects.map((e) =>
        e.instanceId === instanceId ? { ...e, enabled: !e.enabled } : e
      ),
    })),

  clearEffects: () => set({ effects: [], selectedEffectId: null }),

  setEffects: (effects) => set({ effects }),


  toggleLock: (instanceId) =>
    set((state) => ({
      effects: state.effects.map((e) =>
        e.instanceId === instanceId
          ? { ...e, locked: !e.locked }
          : e
      ),
    })),

  duplicateEffect: (instanceId) =>
    set((state) => {
      const effectToCopy = state.effects.find((e) => e.instanceId === instanceId);
      if (!effectToCopy) return state;
      const duplicated: SerializedEffect = {
        ...effectToCopy,
        instanceId: crypto.randomUUID(),
        parameters: { ...effectToCopy.parameters },
      };
      return { effects: [...state.effects, duplicated] };
    }),


  copyParams: (instanceId) =>
    set((state) => {
      const effect = state.effects.find((e) => e.instanceId === instanceId);
      if (effect) return { clipboardParams: { ...effect.parameters } };
      return state;
    }),

  pasteParams: (instanceId) =>
    set((state) => {
      if (!state.clipboardParams) return state;
      return {
        effects: state.effects.map((e) =>
          e.instanceId === instanceId
            ? { ...e, parameters: { ...e.parameters, ...state.clipboardParams } }
            : e
        ),
      };
    }),
}));
