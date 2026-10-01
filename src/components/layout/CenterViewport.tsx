"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMediaStore } from "@/store/MediaStore";
import { useEffectStore } from "@/store/EffectStore";
import { useTimelineStore } from "@/store/TimelineStore";
import { useUIStore } from "@/store/UIStore";
import { useConsoleStore } from "@/store/ConsoleStore";
import { useExportStore } from "@/store/ExportStore";
import { useDropzone } from "react-dropzone";
import type { MediaItem } from "@/types";
import { X, Loader2, Play } from "lucide-react";

export default function CenterViewport() {
  const { activeMedia, setActiveMedia } = useMediaStore();
  const { effects } = useEffectStore();
  const { isPlaying, setDuration, setCurrentTime, currentTime } = useTimelineStore();
  const { viewportZoom, viewportPanX, viewportPanY, setViewportZoom, setViewportPan, resetViewport, setFps, setRenderTime, setMemoryUsage } = useUIStore();
  const { addEntry } = useConsoleStore();
  const { jobs, cancelJob, removeJob } = useExportStore();
  
  const activeJobs = jobs.filter(j => j.status !== "completed" && j.status !== "failed");
  const hasActiveJobs = activeJobs.length > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isWorkerReady = useRef(true);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const url = URL.createObjectURL(file);

      if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.onloadedmetadata = () => {
          const media: MediaItem = {
            id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            file, url, type: "video",
            width: video.videoWidth, height: video.videoHeight,
            duration: video.duration, name: file.name,
          };
          setActiveMedia(media);
          addEntry("success", `Loaded: ${file.name}`, "Media");
        };
        video.src = url;
      } else {
        const img = new Image();
        img.onload = () => {
          const media: MediaItem = {
            id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            file, url,
            type: file.type === "image/gif" ? "gif" : "image",
            width: img.naturalWidth, height: img.naturalHeight,
            name: file.name,
          };
          setActiveMedia(media);
          addEntry("success", `Loaded: ${file.name}`, "Media");
        };
        img.src = url;
      }
    },
    [setActiveMedia, addEntry]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
      "video/*": [".mp4", ".webm"],
    },
    noClick: !!activeMedia,
  });

  // Initialize render worker
  useEffect(() => {
    if (!activeMedia || !canvasContainerRef.current) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.objectFit = "contain";
    canvasContainerRef.current.innerHTML = "";
    canvasContainerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    let worker: Worker;
    try {
      const offscreen = canvas.transferControlToOffscreen();
      worker = new Worker(
        new URL("@/engine/workers/RenderWorker.ts", import.meta.url),
        { type: "module" }
      );
      
      worker.onerror = (e) => {
        if (e.message && e.message.includes('addListener')) {
          e.preventDefault();
        }
      };

      worker.postMessage({ type: "INIT", payload: { canvas: offscreen } }, [offscreen]);

      worker.onmessage = (e) => {
        if (e.data.type === "FRAME_RENDERED") {
          isWorkerReady.current = true;
          setRenderTime(e.data.payload.renderTime);
        } else if (e.data.type === "LOG") {
          addEntry(e.data.payload.level, e.data.payload.message, e.data.payload.source);
        } else if (e.data.type === "ERROR") {
          addEntry("error", e.data.payload.message, "Worker");
          isWorkerReady.current = true; // Recover from error
        } else if (e.data.type === "READY") {
          addEntry("info", "Render worker initialized", "System");
          // Re-send effects when a new worker is ready!
          worker.postMessage({
            type: "UPDATE_EFFECTS",
            payload: { effects: useEffectStore.getState().effects },
          });
        }
      };

      workerRef.current = worker;
    } catch {
      addEntry("warn", "OffscreenCanvas not supported, using main-thread rendering", "System");
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "DESTROY" });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [activeMedia, addEntry, setRenderTime]);

  // Update effects in worker
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "UPDATE_EFFECTS",
        payload: { effects },
      });
    }
  }, [effects]);

  // Resize worker canvas when media loads
  const handleMediaLoaded = useCallback(() => {
    if (!mediaRef.current) return;

    let mw = 1280, mh = 720;
    if (mediaRef.current instanceof HTMLVideoElement) {
      mw = mediaRef.current.videoWidth;
      mh = mediaRef.current.videoHeight;
      setDuration(mediaRef.current.duration);
    } else {
      mw = (mediaRef.current as HTMLImageElement).naturalWidth;
      mh = (mediaRef.current as HTMLImageElement).naturalHeight;
      setDuration(0);
    }

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "RESIZE",
        payload: { width: mw, height: mh },
      });
    }



    addEntry("info", `Canvas: ${mw}×${mh}`, "Viewport");
  }, [setDuration, addEntry]);

  // Render loop
  useEffect(() => {
    if (!activeMedia || !mediaRef.current) return;

    const loop = async () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;

        // Memory tracking
        const perf = (performance as any);
        if (perf.memory) {
          setMemoryUsage(Math.round(perf.memory.usedJSHeapSize / 1048576));
        }
      }

      if (
        workerRef.current &&
        isWorkerReady.current &&
        mediaRef.current &&
        ((mediaRef.current instanceof HTMLVideoElement && mediaRef.current.readyState >= 2) ||
          mediaRef.current instanceof HTMLImageElement)
      ) {
        isWorkerReady.current = false;
        try {
          const bitmap = await createImageBitmap(mediaRef.current);
          workerRef.current.postMessage(
            {
              type: "RENDER_FRAME",
              payload: {
                sourceBitmap: bitmap,
                context: {
                  time: now / 1000,
                  frame: frameCountRef.current,
                  isPlaying,
                  mediaTime: mediaRef.current instanceof HTMLVideoElement ? mediaRef.current.currentTime : 0,
                },
              },
            },
            [bitmap]
          );
        } catch {
          isWorkerReady.current = true;
        }
      }

      // Update timeline
      if (isPlaying && mediaRef.current instanceof HTMLVideoElement) {
        setCurrentTime(mediaRef.current.currentTime);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeMedia, isPlaying, setFps, setCurrentTime, setMemoryUsage]);

  // Video playback control
  useEffect(() => {
    if (mediaRef.current instanceof HTMLVideoElement) {
      if (isPlaying) mediaRef.current.play().catch(() => {});
      else mediaRef.current.pause();
    }
  }, [isPlaying]);

  // Sync seek (when currentTime in store jumps by more than 0.1s from video)
  useEffect(() => {
    if (mediaRef.current instanceof HTMLVideoElement) {
      if (Math.abs(mediaRef.current.currentTime - currentTime) > 0.1) {
        mediaRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  // Save Frame Listener
  useEffect(() => {
    const handleSaveFrame = () => {
      if (!canvasRef.current || !activeMedia) return;
      try {
        const url = canvasRef.current.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `arttrack-frame-${activeMedia.name}-${currentTime.toFixed(2)}s.png`;
        a.click();
        addEntry("success", "Frame saved", "Export");
      } catch (err: any) {
        addEntry("error", `Save frame failed: ${err.message}`, "Export");
      }
    };
    document.addEventListener("arttrack:save-frame", handleSaveFrame);
    return () => document.removeEventListener("arttrack:save-frame", handleSaveFrame);
  }, [activeMedia, currentTime, addEntry]);

  // Export logic has been moved to background worker queue for final renders.
  // Quick Export Listener (Realtime preview)
  useEffect(() => {
    const handleQuickExport = (e: any) => {
      const { format, fps } = e.detail;
      if (!canvasRef.current || !activeMedia) return;
      
      try {
        const stream = (canvasRef.current as any).captureStream(fps);
        
        // Setup MediaRecorder
        const mimeType = format === 'webm' ? 'video/webm;codecs=vp9' : 'video/webm'; 
        const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : '' });
        const chunks: BlobPart[] = [];
        
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunks.push(ev.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `arttrack-quick-${activeMedia.name}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          addEntry("success", "Quick Export completed", "Export");
        };
        
        recorder.start();
        addEntry("info", "Quick Export started...", "Export");
        
        // Stop automatically
        if (activeMedia.type === "video" && mediaRef.current) {
            const videoEl = mediaRef.current as HTMLVideoElement;
            videoEl.currentTime = 0;
            if (!isPlaying) {
              videoEl.play().catch(() => {});
            }
            setTimeout(() => {
                recorder.stop();
            }, (activeMedia.duration || 10) * 1000 + 500); // Small buffer
        } else {
           setTimeout(() => {
              recorder.stop();
           }, 2000); // 2 seconds for image
        }

      } catch (err: any) {
        addEntry("error", `Quick Export failed: ${err.message}`, "Export");
      }
    };
    
    document.addEventListener("arttrack:quick-export", handleQuickExport);
    return () => document.removeEventListener("arttrack:quick-export", handleQuickExport);
  }, [activeMedia, addEntry, isPlaying]);

  // Pan/Zoom handlers
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewportZoom(viewportZoom * delta);
    },
    [viewportZoom, setViewportZoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: viewportPanX, panY: viewportPanY };
      }
    },
    [viewportPanX, viewportPanY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewportPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
      }
    },
    [isPanning, setViewportPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div
      {...getRootProps()}
      ref={containerRef}
      className="flex-1 bg-bg relative overflow-hidden flex flex-col focus:outline-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? "grabbing" : "default" }}
    >
      <input {...getInputProps()} />

      {/* Drag Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-accent-green/10 border-2 border-dashed border-accent-green flex items-center justify-center">
          <p className="font-pixel text-3xl text-accent-green tracking-widest">
            DROP MEDIA
          </p>
        </div>
      )}

      {/* Export Overlay */}
      {jobs.length > 0 && (
        <div className="absolute inset-0 z-50 bg-bg/95 backdrop-blur-md flex flex-col items-center justify-center p-8">
           <div className="w-full max-w-2xl bg-bg-panel border border-border flex flex-col max-h-full">
             <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-bg-surface">
               <span className="font-pixel text-lg text-accent-green tracking-widest">EXPORT QUEUE</span>
               {!hasActiveJobs && (
                 <button onClick={() => jobs.forEach(j => removeJob(j.id))} className="text-[10px] font-mono text-text-muted hover:text-white uppercase transition-colors">Clear All</button>
               )}
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {jobs.map(job => (
                 <div key={job.id} className="border border-border bg-bg p-3 relative">
                   <div className="flex justify-between items-start mb-2">
                     <div>
                       <div className="font-mono text-[12px] text-white font-bold">{job.projectName}</div>
                       <div className="font-mono text-[9px] text-text-dim uppercase mt-0.5">
                         {job.options.resolution} • {job.options.fps}FPS • {job.options.qualityProfile} • {job.options.format}
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className={`font-mono text-[10px] uppercase font-bold ${
                         job.status === "completed" ? "text-accent-green" : 
                         job.status === "failed" ? "text-red-500" : "text-accent-blue"
                       }`}>
                         {job.status}
                       </span>
                       {(job.status === "waiting" || job.status === "decoding" || job.status === "rendering" || job.status === "encoding") && (
                         <button onClick={() => cancelJob(job.id)} className="text-text-muted hover:text-red-500 transition-colors" title="Cancel Job">
                           <X size={14} />
                         </button>
                       )}
                       {(job.status === "completed" || job.status === "failed") && (
                         <button onClick={() => removeJob(job.id)} className="text-text-muted hover:text-white transition-colors" title="Remove">
                           <X size={14} />
                         </button>
                       )}
                     </div>
                   </div>

                   {/* Progress Bar */}
                   <div className="w-full h-1.5 bg-bg-surface border border-border/50 overflow-hidden mb-2">
                     <div 
                       className={`h-full transition-all duration-300 ${job.status === 'failed' ? 'bg-red-500' : 'bg-accent-green'}`} 
                       style={{ width: `${job.progress}%` }} 
                     />
                   </div>

                   {/* Stats Footer */}
                   <div className="flex justify-between items-center font-mono text-[9px] text-text-secondary uppercase">
                     <div className="flex gap-4">
                       <span className="w-48 truncate" title={job.progressMessage}>{job.progressMessage || "Waiting"}</span>
                       {job.status === "rendering" && (
                         <>
                           <span className="text-accent-blue">{job.currentFrame} / {job.totalFrames} F</span>
                           <span>{job.renderSpeed.toFixed(1)} fps</span>
                         </>
                       )}
                     </div>
                     {job.status === "rendering" && (
                       <div className="flex gap-4 text-text-dim">
                         <span>RAM: {job.memoryUsage}MB</span>
                         <span>ETA: {Math.max(0, Math.ceil(job.estimatedTimeRemaining))}s</span>
                       </div>
                     )}
                     {job.status === "failed" && (
                       <span className="text-red-400">{job.error}</span>
                     )}
                   </div>
                 </div>
               ))}
             </div>
             
             {!hasActiveJobs && (
               <div className="p-3 border-t border-border bg-bg-surface text-center">
                 <button onClick={() => jobs.forEach(j => removeJob(j.id))} className="text-[10px] font-mono font-bold text-accent-green hover:text-white transition-colors uppercase">
                   Return to Editor
                 </button>
               </div>
             )}
           </div>
        </div>
      )}

      {/* Viewport Toolbar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
        <div className="bg-bg-panel/90 border border-border px-2 py-0.5 font-mono text-[10px] text-text-muted flex items-center gap-3">
          <button
            onClick={() => setViewportZoom(1)}
            className="hover:text-text-primary transition-colors"
          >
            100%
          </button>
          <button
            onClick={() => {
              resetViewport();
            }}
            className="hover:text-text-primary transition-colors"
          >
            FIT
          </button>

          <div className="w-px h-3 bg-border" />
          <span className="text-text-dim">{Math.round(viewportZoom * 100)}%</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center viewport-grid">
        {!activeMedia ? (
          <div className="text-center space-y-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="font-pixel text-3xl text-border-light tracking-widest">
              NO MEDIA
            </div>
            <p className="font-mono text-[11px] text-text-dim">
              Drag & Drop media here, or click Upload
            </p>
            <p className="font-mono text-[9px] text-text-dim">
              PNG · JPG · WEBP · GIF · MP4
            </p>
          </div>
        ) : (
          <div
            className="relative bg-black overflow-hidden"
            style={{
              transform: `translate(${viewportPanX}px, ${viewportPanY}px) scale(${viewportZoom})`,
              transformOrigin: "center center",
            }}
          >
            <div
              ref={canvasContainerRef}
              className="flex items-center justify-center"
              style={{
                width: activeMedia.width,
                height: activeMedia.height,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />

            {/* Hidden media element */}
            {activeMedia.type === "video" ? (
              <video
                ref={(el) => { mediaRef.current = el; }}
                src={activeMedia.url}
                className="hidden"
                loop
                muted
                playsInline
                onLoadedMetadata={handleMediaLoaded}
              />
            ) : (
              <img
                ref={(el) => { mediaRef.current = el; }}
                src={activeMedia.url}
                alt="Source"
                className="hidden"
                onLoad={handleMediaLoaded}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
