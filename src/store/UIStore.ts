import { create } from "zustand";


interface UIState {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  processingState: string;
  activeTool: string;

  isLeftSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isBottomPanelOpen: boolean;
  bottomTab: "player" | "console";

  viewportZoom: number;
  viewportPanX: number;
  viewportPanY: number;

  setFps: (fps: number) => void;
  setRenderTime: (ms: number) => void;
  setMemoryUsage: (mb: number) => void;
  setProcessingState: (state: string) => void;
  setActiveTool: (tool: string) => void;

  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  setBottomTab: (tab: "player" | "console") => void;

  setViewportZoom: (zoom: number) => void;
  setViewportPan: (x: number, y: number) => void;
  resetViewport: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  fps: 0,
  renderTime: 0,
  memoryUsage: 0,
  processingState: "idle",
  activeTool: "none",

  isLeftSidebarOpen: true,
  isRightPanelOpen: true,
  isBottomPanelOpen: true,
  bottomTab: "player",

  viewportZoom: 1,
  viewportPanX: 0,
  viewportPanY: 0,

  setFps: (fps) => set({ fps }),
  setRenderTime: (ms) => set({ renderTime: ms }),
  setMemoryUsage: (mb) => set({ memoryUsage: mb }),
  setProcessingState: (state) => set({ processingState: state }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleLeftSidebar: () =>
    set((s) => ({ isLeftSidebarOpen: !s.isLeftSidebarOpen })),
  toggleRightPanel: () =>
    set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  toggleBottomPanel: () =>
    set((s) => ({ isBottomPanelOpen: !s.isBottomPanelOpen })),
  setBottomTab: (tab) => set({ bottomTab: tab }),

  setViewportZoom: (zoom) =>
    set({ viewportZoom: Math.max(0.1, Math.min(20, zoom)) }),
  setViewportPan: (x, y) => set({ viewportPanX: x, viewportPanY: y }),
  resetViewport: () =>
    set({ viewportZoom: 1, viewportPanX: 0, viewportPanY: 0 }),
}));
