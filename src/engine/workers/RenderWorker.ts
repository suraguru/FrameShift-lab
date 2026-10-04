// ═══════════════════════════════════════════════════════════
// FRAMESHIFT WORKSTATION — RENDER WORKER
// Runs in a dedicated Web Worker thread for off-main-thread rendering
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════

"use client";



import { RenderPipeline } from "../core/RenderPipeline";
import type { RenderContext, ConsoleEntry } from "@/types";

// Import all plugins to register them in the worker's plugin registry
import { pluginRegistry } from "../core/PluginRegistry";
import "../plugins";

let pipeline: RenderPipeline | null = null;
let targetCanvas: OffscreenCanvas | null = null;
let targetCtx: OffscreenCanvasRenderingContext2D | null = null;
let isRendering = false;

function sendLog(entry: ConsoleEntry): void {
  self.postMessage({ type: "LOG", payload: entry });
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case "INIT": {
      targetCanvas = payload.canvas;
      if (targetCanvas) {
        targetCtx = targetCanvas.getContext("2d")!;
        pipeline = new RenderPipeline(targetCanvas.width || 1920, targetCanvas.height || 1080);
        pipeline.setLogCallback(sendLog);
        self.postMessage({ type: "READY" });
      }
      break;
    }

    case "RESIZE": {
      if (targetCanvas) {
        targetCanvas.width = payload.width;
        targetCanvas.height = payload.height;
      }
      if (pipeline) {
        pipeline.resize(payload.width, payload.height);
      }
      break;
    }

    case "UPDATE_EFFECTS": {
      if (pipeline) {
        try {
          await pipeline.updateEffects(payload.effects);
        } catch (err) {
          self.postMessage({
            type: "ERROR",
            payload: { message: `Effect update failed: ${err}` },
          });
        }
      }
      break;
    }

    case "RENDER_FRAME": {
      if (!pipeline || !targetCanvas || !targetCtx || isRendering) return;
      isRendering = true;

      const { sourceBitmap, context } = payload;

      try {
        const renderTime = await pipeline.renderFrame(sourceBitmap, {
          ...context,
          mode: "viewport",
          quality: "preview"
        } as Partial<RenderContext>);

        // Copy pipeline output to the display canvas
        const outputCanvas = pipeline.getOutputCanvas();
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        targetCtx.drawImage(outputCanvas, 0, 0);

        self.postMessage({
          type: "FRAME_RENDERED",
          payload: { renderTime },
        });
      } catch (err) {
        self.postMessage({
          type: "ERROR",
          payload: { message: `Render failed: ${err}` },
        });
      }

      isRendering = false;
      break;
    }

    case "DESTROY": {
      if (pipeline) {
        pipeline.destroy();
        pipeline = null;
      }
      targetCanvas = null;
      targetCtx = null;
      break;
    }
  }
};
