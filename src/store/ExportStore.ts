import { create } from "zustand";
import type { ExportFormat, ExportQualityProfile, ExportResolution, ExportJob, ExportOptions } from "@/types";

interface ExportState {
  jobs: ExportJob[];
  
  // Default Settings for the Menu
  exportMode: "final" | "quick";
  format: ExportFormat;
  qualityProfile: ExportQualityProfile;
  resolution: ExportResolution;
  fps: number;
  bitrate: number;
  audioEnabled: boolean;
  transparency: boolean;

  // Actions
  setExportMode: (mode: "final" | "quick") => void;
  setFormat: (format: ExportFormat) => void;
  setQualityProfile: (profile: ExportQualityProfile) => void;
  setResolution: (resolution: ExportResolution) => void;
  setFps: (fps: number) => void;
  setBitrate: (bitrate: number) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setTransparency: (transparency: boolean) => void;

  queueJob: (projectName: string, options: ExportOptions) => void;
  cancelJob: (jobId: string) => void;
  removeJob: (jobId: string) => void;
  updateJobProgress: (jobId: string, updates: Partial<ExportJob>) => void;
}

export const useExportStore = create<ExportState>((set, get) => ({
  jobs: [],
  
  exportMode: "final",
  format: "mp4",
  qualityProfile: "standard",
  resolution: "source",
  fps: 30,
  bitrate: 15000,
  audioEnabled: true,
  transparency: false,

  setExportMode: (exportMode) => set({ exportMode }),
  setFormat: (format) => set({ format }),
  setQualityProfile: (qualityProfile) => set({ qualityProfile }),
  setResolution: (resolution) => set({ resolution }),
  setFps: (fps) => set({ fps }),
  setBitrate: (bitrate) => set({ bitrate }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setTransparency: (transparency) => set({ transparency }),

  queueJob: (projectName, options) => {
    const newJob: ExportJob = {
      id: crypto.randomUUID(),
      projectName,
      options,
      status: "waiting",
      progress: 0,
      progressMessage: "Queued",
      currentFrame: 0,
      totalFrames: 0,
      fps: 0,
      estimatedTimeRemaining: 0,
      elapsedTime: 0,
      memoryUsage: 0,
      renderSpeed: 0,
      createdAt: Date.now(),
    };
    set((state) => ({ jobs: [...state.jobs, newJob] }));
    // A background ExportManager will listen to the store and start waiting jobs sequentially
  },

  cancelJob: (jobId) => {
    set((state) => ({
      jobs: state.jobs.map((job) => 
        job.id === jobId && job.status !== "completed" && job.status !== "failed"
          ? { ...job, status: "failed", error: "Cancelled by user" } 
          : job
      )
    }));
  },

  removeJob: (jobId) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== jobId)
    }));
  },

  updateJobProgress: (jobId, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) => 
        job.id === jobId ? { ...job, ...updates } : job
      )
    }));
  }
}));
