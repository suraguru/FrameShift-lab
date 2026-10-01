import { useExportStore } from "@/store/ExportStore";
import { useMediaStore } from "@/store/MediaStore";
import { useEffectStore } from "@/store/EffectStore";
import { useConsoleStore } from "@/store/ConsoleStore";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let isProcessing = false;
let cancelController: AbortController | null = null;

function checkQueue() {
  const state = useExportStore.getState();
  const waitingJob = state.jobs.find((j) => j.status === "waiting");
  if (waitingJob && !isProcessing) {
    console.log("[ExportManager] Found waiting job, processing...", waitingJob.id);
    processJob(waitingJob.id);
  }
}

let initialized = false;
export function initExportManager() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  useExportStore.subscribe(() => {
    checkQueue();
  });
  setTimeout(checkQueue, 100);
}

export async function processJob(jobId: string) {
    isProcessing = true;
    cancelController = new AbortController();
    const update = (updates: any) => useExportStore.getState().updateJobProgress(jobId, updates);
    const logConsole = (level: "info" | "success" | "warning" | "error", msg: string) => 
      useConsoleStore.getState().addEntry(level, msg, "Export");

    const job = useExportStore.getState().jobs.find((j) => j.id === jobId);
    if (!job) {
      isProcessing = false;
      return;
    }

    logConsole("info", `Starting export job: ${jobId}`);

    const { options } = job;
    const media = useMediaStore.getState().activeMedia;
    const effects = useEffectStore.getState().effects;

    if (!media) {
      update({ status: "failed", error: "No active media found." });
      logConsole("error", "Export failed: No active media found.");
      isProcessing = false;
      return;
    }

    update({ status: "decoding", startedAt: Date.now(), progressMessage: "Initializing Workers..." });
    logConsole("info", "Initializing rendering and encoding workers...");

    try {
      const isVideo = media.type === "video";
      
      // Initialize Workers
      console.log("[ExportManager] Creating workers...");
      const decodeWorker = new Worker(new URL("../workers/DecodeWorker.ts", import.meta.url), { type: "module" });
      const renderWorker = new Worker(new URL("../workers/OfflineRenderWorker.ts", import.meta.url), { type: "module" });
      const encodeWorker = new Worker(new URL("../workers/EncodeWorker.ts", import.meta.url), { type: "module" });
      console.log("[ExportManager] Workers created (constructor returned)");

      // Immediately catch worker initialization errors to prevent race conditions
      let workerFailed = false;
      let initError: Error | null = null;
      const onInitError = (workerName: string) => (err: any) => {
        console.error(`[ExportManager] ${workerName} onerror fired:`, err);
        workerFailed = true;
        initError = new Error(`${workerName}: ${err.message || "Worker failed to initialize (syntax or import error)"}`);
      };
      decodeWorker.onerror = onInitError("DecodeWorker");
      renderWorker.onerror = onInitError("RenderWorker");
      encodeWorker.onerror = onInitError("EncodeWorker");

      // Also catch messageerror (structured clone failures)
      decodeWorker.onmessageerror = (e) => console.error("[ExportManager] DecodeWorker messageerror:", e);
      renderWorker.onmessageerror = (e) => console.error("[ExportManager] RenderWorker messageerror:", e);
      encodeWorker.onmessageerror = (e) => console.error("[ExportManager] EncodeWorker messageerror:", e);

      // Determine Resolution
      let targetWidth = 1920;
      let targetHeight = 1080;
      if (options.resolution === "source") {
        targetWidth = media.width;
        targetHeight = media.height;
      } else if (options.resolution === "1440p") {
        targetWidth = 2560; targetHeight = 1440;
      } else if (options.resolution === "4k") {
        targetWidth = 3840; targetHeight = 2160;
      }

      // 3. Connect the Pipeline
      let totalFrames = isVideo ? Math.floor((media.duration || 10) * options.fps) : options.fps * 2;
      update({ totalFrames });

      // 1. Setup Render Worker (with timeout)
      console.log("[ExportManager] Sending INIT_OFFLINE to RenderWorker...");
      await new Promise<void>((resolve, reject) => {
        if (workerFailed) return reject(initError);
        
        const timeout = setTimeout(() => {
          reject(new Error("RenderWorker INIT_OFFLINE timed out after 10s — worker may have crashed silently during module evaluation"));
        }, 10000);

        renderWorker.onmessage = (e) => {
          console.log("[ExportManager] RenderWorker message received:", e.data.type);
          if (e.data.type === "OFFLINE_READY") { clearTimeout(timeout); resolve(); }
          else if (e.data.type === "ERROR") { clearTimeout(timeout); reject(new Error(e.data.payload?.message || e.data.payload)); }
        };
        renderWorker.onerror = (err) => { clearTimeout(timeout); reject(initError || new Error(`RenderWorker onerror: ${(err as any).message || err}`)); };
        renderWorker.postMessage({
          type: "INIT_OFFLINE",
          payload: { width: targetWidth, height: targetHeight, effects, quality: options.qualityProfile, totalFrames }
        });
      });
      console.log("[ExportManager] RenderWorker initialized successfully");

      // 2. Setup Encode Worker (with timeout)
      console.log("[ExportManager] Sending INIT_ENCODE to EncodeWorker...");
      await new Promise<void>((resolve, reject) => {
        if (workerFailed) return reject(initError);

        const timeout = setTimeout(() => {
          reject(new Error("EncodeWorker INIT_ENCODE timed out after 10s — worker may have crashed silently during module evaluation"));
        }, 10000);

        encodeWorker.onmessage = (e) => {
          console.log("[ExportManager] EncodeWorker message received:", e.data.type);
          if (e.data.type === "ENCODE_READY") { clearTimeout(timeout); resolve(); }
          else if (e.data.type === "ERROR") { clearTimeout(timeout); reject(new Error(e.data.payload?.message || e.data.payload)); }
        };
        encodeWorker.onerror = (err) => { clearTimeout(timeout); reject(initError || new Error(`EncodeWorker onerror: ${(err as any).message || err}`)); };
        encodeWorker.postMessage({
          type: "INIT_ENCODE",
          payload: { options, width: targetWidth, height: targetHeight }
        });
      });
      console.log("[ExportManager] EncodeWorker initialized successfully");



      let framesDecoded = 0;
      let framesRendered = 0;
      let framesEncoded = 0;
      let isDecodeComplete = false;
      let isFinalizing = false;

      // Handle Decoded Frames -> Render Worker
      decodeWorker.onmessage = (e) => {
        if (e.data.type === "FRAME_DECODED") {
          framesDecoded++;
          const { frame, frameIndex } = e.data.payload;
          renderWorker.postMessage({
            type: "RENDER_OFFLINE_FRAME",
            payload: { sourceBitmap: frame, context: { time: frameIndex / options.fps, frame: frameIndex }, frameIndex }
          }, [frame]);
        } else if (e.data.type === "DECODE_COMPLETE") {
          isDecodeComplete = true;
          if (isVideo) {
            totalFrames = framesDecoded; // Adjust to actual decoded frames
            update({ totalFrames });
          }
          logConsole("success", `Decoding complete. Decoded ${framesDecoded} frames.`);
          update({ progressMessage: "Decoding complete. Finishing rendering..." });
          if (framesEncoded >= totalFrames && !isFinalizing) {
            isFinalizing = true;
            logConsole("info", "Finalizing encoded file...");
            update({ status: "finalizing", progressMessage: "Finalizing file..." });
            encodeWorker.postMessage({ type: "FINALIZE" });
          }
        } else if (e.data.type === "ERROR") {
          cancelController?.abort();
          logConsole("error", `DecodeWorker error: ${e.data.payload?.message || e.data.payload}`);
          throw new Error(e.data.payload?.message || e.data.payload);
        }
      };

      // Handle Rendered Frames -> Encode Worker
      renderWorker.onmessage = (e) => {
        if (e.data.type === "OFFLINE_FRAME_RENDERED") {
          framesRendered++;
          const { finalBitmap, frameIndex } = e.data.payload;
          
          update({ status: "rendering", currentFrame: framesRendered, progressMessage: `Rendering frame ${framesRendered} / ${totalFrames}` });
          
          encodeWorker.postMessage({
            type: "ADD_FRAME",
            payload: { bitmap: finalBitmap, frameIndex }
          }, [finalBitmap]);

          // Send ACK back to decode worker to pull more frames
          decodeWorker.postMessage({ type: "ACK" });
        } else if (e.data.type === "ERROR") {
          cancelController?.abort();
          logConsole("error", `RenderWorker error: ${e.data.payload?.message || e.data.payload}`);
          throw new Error(e.data.payload?.message || e.data.payload);
        }
      };

      // Handle Encoded Frames & Completion
      const finalResult = await new Promise<{blob: Blob, filename: string}>((resolve, reject) => {
        encodeWorker.onmessage = (e) => {
          if (e.data.type === "FRAME_ENCODED") {
            framesEncoded++;
            const progress = (framesEncoded / totalFrames) * 100;
            const elapsedTime = (Date.now() - job.startedAt!) / 1000;
            const renderSpeed = framesEncoded / elapsedTime;
            const estimatedTimeRemaining = (totalFrames - framesEncoded) / renderSpeed;
            
            update({
              progress,
              elapsedTime,
              renderSpeed,
              estimatedTimeRemaining,
              memoryUsage: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 0
            });

            if ((isDecodeComplete || !isVideo) && framesEncoded >= totalFrames && !isFinalizing) {
              isFinalizing = true;
              logConsole("info", "Finalizing encoded file...");
              update({ status: "finalizing", progressMessage: "Finalizing file..." });
              encodeWorker.postMessage({ type: "FINALIZE" });
            }
          } else if (e.data.type === "ENCODE_COMPLETE") {
            logConsole("success", "Encoding phase complete.");
            resolve(e.data.payload);
          } else if (e.data.type === "ERROR") {
            logConsole("error", `EncodeWorker error: ${e.data.payload?.message || e.data.payload}`);
            reject(new Error(e.data.payload?.message || e.data.payload));
          }
        };

        const handleError = (err: any) => {
          logConsole("error", `Worker crashed: ${err.message || "Unknown error"}`);
          reject(new Error(err.message || "Worker crashed"));
        };
        decodeWorker.onerror = handleError;
        renderWorker.onerror = handleError;
        encodeWorker.onerror = handleError;

        // Start Decoder
        if (isVideo) {
          decodeWorker.postMessage({ type: "INIT_DECODE", payload: { file: media.file, fps: options.fps } });
        } else {
          // It's an image, just duplicate it
          createImageBitmap(media.file).then(async bmp => {
             for(let i=1; i<=totalFrames; i++) {
                if (cancelController?.signal.aborted) break;
                const frameBmp = await createImageBitmap(bmp);
                renderWorker.postMessage({
                  type: "RENDER_OFFLINE_FRAME",
                  payload: { sourceBitmap: frameBmp, context: { time: i / options.fps, frame: i }, frameIndex: i }
                }, [frameBmp]);
             }
             isDecodeComplete = true;
             update({ progressMessage: "Decoding complete. Finishing rendering..." });
             if (framesEncoded >= totalFrames && !isFinalizing) {
               isFinalizing = true;
               update({ status: "finalizing", progressMessage: "Finalizing file..." });
               encodeWorker.postMessage({ type: "FINALIZE" });
             }
          });
        }
      });

      // 4. Cleanup Workers
      decodeWorker.terminate();
      renderWorker.terminate();
      encodeWorker.terminate();

      // 5. Audio Muxing (FFmpeg Phase)
      let finalBlob = finalResult.blob;
      let finalFilename = finalResult.filename;

      if (options.audioEnabled && isVideo && (options.format === "mp4" || options.format === "webm")) {
         try {
           update({ progressMessage: "Muxing audio track..." });
           console.log("[ExportManager] Loading FFmpeg WASM...");
           const ffmpeg = new FFmpeg();
           
           ffmpeg.on("log", ({ message }) => {
             console.log("[FFmpeg]", message);
           });

           await ffmpeg.load();
           console.log("[ExportManager] FFmpeg loaded successfully");
           
           const videoExt = options.format === "mp4" ? "mp4" : "webm";
           await ffmpeg.writeFile(`video.${videoExt}`, await fetchFile(finalBlob));
           await ffmpeg.writeFile(`source.${videoExt}`, await fetchFile(media.file));

           await ffmpeg.exec([
             "-i", `video.${videoExt}`,
             "-i", `source.${videoExt}`,
             "-c", "copy",
             "-map", "0:v:0",
             "-map", "1:a:0?", // Take audio if exists
             "-shortest",
             `final.${videoExt}`
           ]);

           const data = await ffmpeg.readFile(`final.${videoExt}`);
           finalBlob = new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: `video/${videoExt}` });
           console.log("[ExportManager] Audio muxing complete");
         } catch (muxErr: any) {
           console.warn("[ExportManager] Audio muxing failed, exporting without audio:", muxErr);
           logConsole("warning", `Audio muxing failed (${muxErr.message || muxErr}). Exporting video without audio track.`);
           // finalBlob remains the video-only blob — export still succeeds
         }
      }

      // Output Trigger
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arttrack-export-${options.resolution}.${finalFilename}`;
      a.click();
      URL.revokeObjectURL(url);

      if (!cancelController.signal.aborted) {
        logConsole("success", `Export completed successfully! Saved as ${finalFilename}`);
        update({ status: "completed", progress: 100, progressMessage: "Export Complete", completedAt: Date.now() });
      }
    } catch (err: any) {
      logConsole("error", `Export failed: ${err.message || "Unknown error"}`);
      update({ status: "failed", error: err.message || "Unknown error occurred" });
    } finally {
      isProcessing = false;
      cancelController = null;
      
      // Check for next job
      checkQueue();
    }
  }

export function cancelJob(jobId: string) {
  const job = useExportStore.getState().jobs.find((j) => j.id === jobId);
  if (job && (job.status === "decoding" || job.status === "rendering" || job.status === "encoding")) {
    cancelController?.abort();
  }
  useExportStore.getState().cancelJob(jobId);
}
