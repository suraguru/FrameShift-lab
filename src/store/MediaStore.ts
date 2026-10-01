import { create } from "zustand";
import type { MediaItem } from "@/types";

interface MediaState {
  activeMedia: MediaItem | null;
  setActiveMedia: (media: MediaItem | null) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  activeMedia: null,
  setActiveMedia: (media) => set({ activeMedia: media }),
}));
