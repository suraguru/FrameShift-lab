import { create } from "zustand";

interface TimelineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fps: number;
  zoom: number;
  isLooping: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  setZoom: (zoom: number) => void;
  setIsLooping: (loop: boolean) => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  fps: 30,
  zoom: 1,
  isLooping: true,

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setFps: (fps) => set({ fps }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setIsLooping: (loop) => set({ isLooping: loop }),

  stepForward: () =>
    set((s) => ({
      currentTime: Math.min(s.currentTime + 1 / s.fps, s.duration),
    })),

  stepBackward: () =>
    set((s) => ({
      currentTime: Math.max(s.currentTime - 1 / s.fps, 0),
    })),

  goToStart: () => set({ currentTime: 0 }),
  goToEnd: () => set((s) => ({ currentTime: s.duration })),
}));
