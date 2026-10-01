import { create } from "zustand";

interface ProjectState {
  projectName: string;
  projectId: string;
  isModified: boolean;
  setProjectName: (name: string) => void;
  setProjectId: (id: string) => void;
  markModified: (modified: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: "Untitled Project",
  projectId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
  isModified: false,
  setProjectName: (name) => set({ projectName: name, isModified: true }),
  setProjectId: (id) => set({ projectId: id }),
  markModified: (modified) => set({ isModified: modified }),
}));
