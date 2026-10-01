// Web Worker polyfill — must run before any imports
if (typeof self !== "undefined" && !self.matchMedia) {
  (self as any).matchMedia = function () {
    return { matches: false, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {} };
  };
}

// Diagnostic: catch any uncaught errors inside the worker
self.addEventListener("error", (e) => {
  console.error("[OfflineRenderWorker] Uncaught error:", e.message, e.filename, e.lineno);
  self.postMessage({ type: "ERROR", payload: { message: `Uncaught: ${e.message} at ${e.filename}:${e.lineno}` } });
});
self.addEventListener("unhandledrejection", (e: any) => {
  console.error("[OfflineRenderWorker] Unhandled rejection:", e.reason);
  self.postMessage({ type: "ERROR", payload: { message: `Unhandled rejection: ${e.reason}` } });
});

console.log("[OfflineRenderWorker] Polyfill done, loading imports...");

import { RenderPipeline } from "../core/RenderPipeline";
import type { RenderContext } from "@/types";
import "../plugins"; // Register plugins

console.log("[OfflineRenderWorker] All imports loaded successfully");

let pipeline: RenderPipeline | null = null;
let currentWidth = 1920;
let currentHeight = 1080;
let exportQuality = "standard";
let totalExportFrames = 1;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;
  console.log("[OfflineRenderWorker] Received message:", type);

  switch (type) {
    case "INIT_OFFLINE": {
      try {
        currentWidth = payload.width;
        currentHeight = payload.height;
        exportQuality = payload.quality || "standard";
        totalExportFrames = payload.totalFrames || 1;
        pipeline = new RenderPipeline(currentWidth, currentHeight);
        
        // Load effects
        if (payload.effects) {
          await pipeline.updateEffects(payload.effects);
        }
        
        self.postMessage({ type: "OFFLINE_READY" });
      } catch (err: any) {
        self.postMessage({ type: "ERROR", payload: { message: `OfflineRenderWorker INIT failed: ${err.message}` } });
      }
      break;
    }

    case "RENDER_OFFLINE_FRAME": {
      if (!pipeline) return;
      
      const { sourceBitmap, context, frameIndex } = payload;
      
      try {
        await pipeline.renderFrame(sourceBitmap, {
          ...context,
          mode: "export",
          quality: exportQuality,
          totalFrames: totalExportFrames
        } as Partial<RenderContext>);
        
        const outputCanvas = pipeline.getOutputCanvas();
        
        // Transfer to bitmap for high-performance zero-copy message passing
        // Unfortunately getOutputCanvas() might return an HTMLCanvasElement on main thread,
        // but in a worker it's always an OffscreenCanvas, so transferToImageBitmap is available.
        let finalBitmap: ImageBitmap;
        if ('transferToImageBitmap' in outputCanvas) {
           finalBitmap = (outputCanvas as OffscreenCanvas).transferToImageBitmap();
        } else {
           // Fallback (though shouldn't hit in worker)
           finalBitmap = await createImageBitmap(outputCanvas);
        }

        (self as any).postMessage({
          type: "OFFLINE_FRAME_RENDERED",
          payload: { finalBitmap, frameIndex }
        }, [finalBitmap]);
        
      } catch (err: any) {
        self.postMessage({
          type: "ERROR",
          payload: { message: `Offline Render failed: ${err.message}` },
        });
      }
      break;
    }

    case "DESTROY": {
      if (pipeline) {
        pipeline.destroy();
        pipeline = null;
      }
      break;
    }
  }
};
