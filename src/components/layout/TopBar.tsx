"use client";

import React, { useRef, useCallback, useEffect } from "react";
import {
  Download, Upload, Settings, Save, FolderOpen, Loader2,
  Monitor, Cpu, Undo2, Redo2, Zap,
} from "lucide-react";
import { useMediaStore } from "@/store/MediaStore";
import { useProjectStore } from "@/store/ProjectStore";
import { useExportStore } from "@/store/ExportStore";
import { useUIStore } from "@/store/UIStore";
import { useEffectStore } from "@/store/EffectStore";
import { useHistoryStore } from "@/store/HistoryStore";
import { useConsoleStore } from "@/store/ConsoleStore";
import { initExportManager } from "@/engine/export/ExportManager";
import type { MediaItem } from "@/types";

export default function TopBar() {
  const { activeMedia, setActiveMedia } = useMediaStore();
  const { projectName, setProjectName } = useProjectStore();
  const { queueJob, exportMode, setExportMode, format, setFormat, qualityProfile, setQualityProfile, resolution, setResolution, audioEnabled, setAudioEnabled } = useExportStore();
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const { toggleRightPanel } = useUIStore();
  const { effects, setEffects } = useEffectStore();
  const { pushState, undo, redo, canUndo, canRedo } = useHistoryStore();
  const { addEntry } = useConsoleStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initExportManager();
  }, []);


  const handleUploadClick = () => fileInputRef.current?.click();
  const handleLoadProjectClick = () => projectInputRef.current?.click();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const media: MediaItem = {
            id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
            file,
            url,
            type: file.type.startsWith("video/") ? "video" : file.type === "image/gif" ? "gif" : "image",
            width: img.naturalWidth,
            height: img.naturalHeight,
            name: file.name,
          };
          setActiveMedia(media);
          addEntry("success", `Loaded: ${file.name} (${img.naturalWidth}×${img.naturalHeight})`, "Media");
        };
        img.onerror = () => {
          // Might be a video
          const video = document.createElement("video");
          video.onloadedmetadata = () => {
            const media: MediaItem = {
              id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
              file,
              url,
              type: "video",
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
              name: file.name,
            };
            setActiveMedia(media);
            addEntry("success", `Loaded: ${file.name} (${video.videoWidth}×${video.videoHeight}, ${video.duration.toFixed(1)}s)`, "Media");
          };
          video.src = url;
        };
        img.src = url;
      }
      e.target.value = "";
    },
    [setActiveMedia, addEntry]
  );

  const handleSaveProject = useCallback(() => {
    const projectData = {
      version: 1,
      name: projectName,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      effects: effects,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "_")}.arttrack.json`;
    a.click();
    URL.revokeObjectURL(url);
    addEntry("success", `Project saved: ${projectName}`, "Project");
  }, [projectName, effects, addEntry]);

  // Listen for Ctrl+S
  useEffect(() => {
    const handler = () => handleSaveProject();
    document.addEventListener("arttrack:save", handler);
    return () => document.removeEventListener("arttrack:save", handler);
  }, [handleSaveProject]);

  const handleLoadProject = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            if (data.name) setProjectName(data.name);
            if (Array.isArray(data.effects)) {
              pushState("Load project", effects);
              setEffects(data.effects);
              addEntry("success", `Project loaded: ${data.name}`, "Project");
            }
          } catch {
            addEntry("error", "Invalid project file", "Project");
          }
        };
        reader.readAsText(file);
      }
      e.target.value = "";
    },
    [setProjectName, setEffects, pushState, effects, addEntry]
  );

  const handleUndo = () => {
    if (canUndo()) {
      const snapshot = undo();
      if (snapshot) setEffects(snapshot);
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      const snapshot = redo();
      if (snapshot) setEffects(snapshot);
    }
  };

  return (
    <header className="h-10 border-b border-border bg-bg-panel flex items-center justify-between px-3 z-50 shrink-0">
      {/* Left: Logo + Project Name */}
      <div className="flex items-center gap-2.5">
        <div className="led-indicator bg-accent-green text-accent-green animate-pulse-glow" />
        <span className="font-pixel text-base tracking-[0.2em] text-text-primary uppercase">
          ART TRACK
        </span>
        <div className="w-px h-5 bg-border mx-1" />
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="font-mono text-[11px] text-text-muted bg-bg px-2 py-0.5 border border-border w-36 focus:outline-none focus:border-accent-blue"
        />
      </div>

      <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted">
        {/* Removed stats area for BottomStatusBar */}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
        />
        <input
          type="file"
          ref={projectInputRef}
          onChange={handleLoadProject}
          className="hidden"
          accept=".json,.arttrack.json"
        />

        <button
          onClick={handleUndo}
          disabled={!canUndo()}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo()}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          onClick={handleLoadProjectClick}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Load Project (Ctrl+O)"
        >
          <FolderOpen size={14} />
        </button>
        <button
          onClick={handleSaveProject}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Save Project (Ctrl+S)"
        >
          <Save size={14} />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          onClick={handleUploadClick}
          className="p-1.5 text-text-muted hover:text-accent-green hover:bg-bg-hover transition-colors"
          title="Upload Media"
        >
          <Upload size={14} />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!activeMedia}
            className="p-1.5 text-text-muted hover:text-accent-blue hover:bg-bg-hover disabled:opacity-30 transition-colors flex items-center gap-1"
            title="Export"
          >
            <Download size={14} />
          </button>
          
          {showExportMenu && activeMedia && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-[#1a1a1a] border border-border shadow-2xl z-50 font-mono p-2">
              <div className="text-[9px] text-text-dim uppercase mb-2 tracking-widest">Export Settings</div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] text-text-secondary mb-1">Export Mode</label>
                  <select 
                    value={exportMode}
                    onChange={(e) => setExportMode(e.target.value as any)}
                    className="w-full bg-[#121212] border border-border text-[10px] p-1 focus:outline-none focus:border-accent-blue uppercase"
                  >
                    <option value="quick">Quick Export (Realtime)</option>
                    <option value="final">Final Export (Offline)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-text-secondary mb-1">Format</label>
                  <select 
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-[#121212] border border-border text-[10px] p-1 focus:outline-none focus:border-accent-blue uppercase"
                  >
                    <option value="png_sequence">PNG Sequence (ZIP)</option>
                    {activeMedia.type === "video" && (
                      <>
                        <option value="mp4">MP4 Video (H.264)</option>
                        <option value="webm">WEBM Video (VP9)</option>
                      </>
                    )}
                    <option value="gif">GIF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-text-secondary mb-1">Resolution</label>
                  <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="w-full bg-[#121212] border border-border text-[10px] p-1 focus:outline-none focus:border-accent-blue uppercase"
                  >
                    <option value="source">Source Resolution</option>
                    <option value="1080p">1080p (1920x1080)</option>
                    <option value="1440p">1440p (2560x1440)</option>
                    <option value="4k">4K (3840x2160)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-text-secondary mb-1">Quality Profile</label>
                  <select 
                    value={qualityProfile}
                    onChange={(e) => setQualityProfile(e.target.value as any)}
                    className="w-full bg-[#121212] border border-border text-[10px] p-1 focus:outline-none focus:border-accent-blue uppercase"
                  >
                    <option value="preview">Preview (Fast)</option>
                    <option value="draft">Draft</option>
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra (Max Sampling)</option>
                  </select>
                </div>
                
                <button 
                  onClick={() => {
                    setShowExportMenu(false);
                    const state = useExportStore.getState();
                    
                    if (state.exportMode === "quick") {
                      document.dispatchEvent(new CustomEvent("arttrack:quick-export", { 
                        detail: { format: state.format, fps: state.fps } 
                      }));
                    } else {
                      queueJob(projectName, {
                        mode: "final",
                        format: state.format,
                        qualityProfile: state.qualityProfile,
                        resolution: state.resolution,
                        fps: state.fps,
                        bitrate: state.bitrate,
                        audioEnabled: state.audioEnabled,
                        transparency: state.transparency
                      });
                    }
                  }}
                  className="w-full bg-accent-blue/10 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue hover:text-black py-1.5 text-[10px] font-bold uppercase transition-colors"
                >
                  {exportMode === "quick" ? "Start Quick Export" : "Add to Queue"}
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={toggleRightPanel}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Settings (Properties Panel)"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
