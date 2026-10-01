/* ============================================================
   ART TRACK WORKSTATION — TYPE DEFINITIONS
   ============================================================ */


// ─── Effect Parameter Types ─────────────────────────────────

export type EffectParamType =
  | "number"
  | "boolean"
  | "string"
  | "color"
  | "select"
  | "curve";

export interface EffectParameter {
  id: string;
  name: string;
  type: EffectParamType;
  defaultValue: number | boolean | string | number[];
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  group?: string;
  basic?: boolean; // If true, shown in basic mode
}

export interface CurvePoint {
  x: number;
  y: number;
}

// ─── Render Context ─────────────────────────────────────────

export interface RenderContext {
  mode: "viewport" | "export";
  quality: "preview" | "draft" | "standard" | "high" | "ultra";
  width: number;
  height: number;
  time: number;
  deltaTime: number;
  frame: number;
  totalFrames: number;
  mouseX: number;
  mouseY: number;
  isPlaying: boolean;
  mediaTime: number;
}

// ─── Effect Plugin Interface ────────────────────────────────

export type EffectCategory =
  | "tracking"
  | "color"
  | "retro"
  | "distortion"
  | "motion"
  | "ai";

export interface EffectPlugin {
  readonly id: string;
  readonly name: string;
  readonly category: EffectCategory;
  instanceId: string;
  enabled: boolean;
  locked?: boolean;
  parameters: Record<string, number | boolean | string | number[]>;
  presets?: Record<string, Record<string, number | boolean | string | number[]>>;

  initialize(): Promise<void>;

  process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    ctx: RenderContext
  ): Promise<void>;

  getParameters(): EffectParameter[];

  serialize(): SerializedEffect;
  deserialize(data: SerializedEffect): void;
  applyPreset?(presetName: string): void;

  destroy(): void;
}

// ─── Serialized Types ───────────────────────────────────────

export interface SerializedEffect {
  id: string;
  instanceId: string;
  enabled: boolean;
  locked?: boolean;
  parameters: Record<string, number | boolean | string | number[]>;
}

// ─── Media Types ────────────────────────────────────────────

export type MediaType = "image" | "video" | "gif";

export interface MediaItem {
  id: string;
  file: File;
  url: string;
  type: MediaType;
  width: number;
  height: number;
  duration?: number;
  name: string;
}

// ─── Project Types ──────────────────────────────────────────

export interface ProjectData {
  version: number;
  name: string;
  createdAt: string;
  modifiedAt: string;
  effects: SerializedEffect[];
  timeline: SerializedTimeline;
  ui: SerializedUIState;
}

export interface SerializedTimeline {
  currentTime: number;
  duration: number;
  fps: number;
  isLooping: boolean;
  zoom: number;
}

export interface SerializedUIState {
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  viewportZoom: number;
  viewportPanX: number;
  viewportPanY: number;
}

// ─── Export Types ────────────────────────────────────────────

export type ExportFormat = "mp4" | "webm" | "gif" | "png_sequence";
export type ExportMode = "quick" | "final";

export type ExportQualityProfile = "preview" | "draft" | "standard" | "high" | "ultra";
export type ExportResolution = "source" | "1080p" | "1440p" | "4k";
export type ExportJobStatus = "waiting" | "decoding" | "rendering" | "encoding" | "finalizing" | "completed" | "failed";

export interface ExportOptions {
  mode: ExportMode;
  format: ExportFormat;
  qualityProfile: ExportQualityProfile;
  resolution: ExportResolution;
  fps: number;
  bitrate: number; // kbps
  audioEnabled: boolean;
  transparency: boolean;
  startTime?: number;
  endTime?: number;
}

export interface ExportJob {
  id: string;
  projectName: string;
  options: ExportOptions;
  status: ExportJobStatus;
  progress: number;
  progressMessage: string;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  estimatedTimeRemaining: number;
  elapsedTime: number;
  memoryUsage: number;
  renderSpeed: number; // e.g. fps or sec/frame
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  blobUrl?: string; // Result download URL
  checkpoint?: any; // For failure recovery
}

// ─── Console Types ──────────────────────────────────────────

export type ConsoleLevel = "info" | "warn" | "error" | "success" | "timing";

export interface ConsoleEntry {
  id: string;
  timestamp: number;
  level: ConsoleLevel;
  message: string;
  source?: string;
}

// ─── History Types ──────────────────────────────────────────

export interface HistoryAction {
  id: string;
  timestamp: number;
  label: string;
  snapshot: SerializedEffect[];
}

// ─── Worker Message Types ───────────────────────────────────

export type RenderWorkerMessage =
  | { type: "INIT"; payload: { canvas: OffscreenCanvas } }
  | { type: "RESIZE"; payload: { width: number; height: number } }
  | {
      type: "UPDATE_EFFECTS";
      payload: { effects: SerializedEffect[] };
    }
  | {
      type: "RENDER_FRAME";
      payload: {
        sourceBitmap: ImageBitmap;
        context: RenderContext;
      };
    }
  | { type: "DESTROY" };

export type RenderWorkerResponse =
  | { type: "FRAME_RENDERED"; payload: { renderTime: number } }
  | { type: "READY" }
  | {
      type: "ERROR";
      payload: { message: string };
    }
  | {
      type: "LOG";
      payload: ConsoleEntry;
    };

export type ExportWorkerMessage =
  | {
      type: "INIT_EXPORT";
      payload: ExportOptions;
    }
  | {
      type: "ADD_FRAME";
      payload: { frameData: ArrayBuffer; frameIndex: number };
    }
  | { type: "FINALIZE" }
  | { type: "CANCEL" };

export type ExportWorkerResponse =
  | { type: "PROGRESS"; payload: { percent: number; message: string } }
  | { type: "COMPLETE"; payload: { blob: Blob; filename: string } }
  | { type: "ERROR"; payload: { message: string } };

