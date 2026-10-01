"use client";

import React from "react";
import { Monitor, Cpu, Zap, Maximize, Clock, FileVideo } from "lucide-react";
import { useUIStore } from "@/store/UIStore";
import { useTimelineStore } from "@/store/TimelineStore";
import { useMediaStore } from "@/store/MediaStore";

export default function StatusBar() {
  const { fps, renderTime, memoryUsage, processingState, viewportZoom } = useUIStore();
  const { currentTime } = useTimelineStore();
  const { activeMedia } = useMediaStore();

  return (
    <div className="h-6 border-t border-border bg-bg-panel flex items-center justify-between px-2 shrink-0 z-50 text-[10px] font-mono text-text-muted">
      {/* Left: General info */}
      <div className="flex items-center gap-4 h-full">
        <span className="flex items-center gap-1.5 h-full px-2 border-r border-border">
          <FileVideo size={11} className="text-accent-blue" />
          {activeMedia ? `${activeMedia.width}×${activeMedia.height}` : "NO MEDIA"}
        </span>
        <span className="flex items-center gap-1.5 h-full px-2 border-r border-border">
          <Maximize size={11} className="text-text-dim" />
          Zoom: {Math.round(viewportZoom * 100)}%
        </span>
        <span className="flex items-center gap-1.5 h-full px-2 border-r border-border">
          <Clock size={11} className="text-text-dim" />
          Time: {currentTime.toFixed(2)}s
        </span>
      </div>

      {/* Right: Performance Metrics */}
      <div className="flex items-center h-full">
        <span className={`flex items-center gap-1.5 h-full px-3 border-l border-border uppercase ${
              processingState === "idle"
                ? "text-text-dim"
                : "text-accent-green animate-pulse"
            }`}>
          Worker: {processingState}
        </span>
        <span className="flex items-center gap-1.5 h-full px-3 border-l border-border uppercase text-text-dim">
          CANVAS2D
        </span>
        <span className="flex items-center gap-1.5 h-full px-3 border-l border-border" title="Render Time">
          <Zap size={11} className="text-accent-yellow" />
          {renderTime.toFixed(1)}ms
        </span>
        <span className="flex items-center gap-1.5 h-full px-3 border-l border-border" title="Memory">
          <Cpu size={11} className="text-accent-red" />
          {memoryUsage}MB
        </span>
        <span className="flex items-center gap-1.5 h-full px-3 border-l border-border" title="FPS">
          <Monitor size={11} className="text-accent-blue" />
          <span className={fps < 30 ? "text-accent-red font-bold" : "text-accent-green font-bold"}>
            {fps}
          </span>
          <span className="text-text-dim">FPS</span>
        </span>
      </div>
    </div>
  );
}
