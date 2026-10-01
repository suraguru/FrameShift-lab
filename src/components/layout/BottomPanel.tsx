"use client";

import React, { useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward,
  Repeat, Terminal, Trash2, Video, Square, Camera
} from "lucide-react";
import { useMediaStore } from "@/store/MediaStore";
import { useTimelineStore } from "@/store/TimelineStore";
import { useUIStore } from "@/store/UIStore";
import { useConsoleStore } from "@/store/ConsoleStore";

export default function BottomPanel() {
  const { activeMedia } = useMediaStore();
  const {
    isPlaying, currentTime, duration, setIsPlaying,
    isLooping, setIsLooping, setCurrentTime,
    stepForward, stepBackward, goToStart,
  } = useTimelineStore();
  const { isBottomPanelOpen, bottomTab, setBottomTab } = useUIStore();
  const { entries, clear, filter, setFilter, getFiltered } = useConsoleStore();
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  if (!isBottomPanelOpen) return null;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}:${ms.toString().padStart(2, "0")}`;
  };

  const filteredEntries = getFiltered();

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    if (duration > 0) {
      setCurrentTime(percentage * duration);
    }
  };

  return (
    <div className="h-44 border-t border-border bg-bg-panel flex flex-col z-40 shrink-0">
      {/* Tab Bar */}
      <div className="h-8 border-b border-border flex items-center justify-between px-2 bg-bg shrink-0">
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex gap-0.5 mr-4">
            <button
              onClick={() => setBottomTab("player")}
              className={`px-2 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                bottomTab === "player"
                  ? "text-accent-green border-b border-accent-green"
                  : "text-text-dim hover:text-text-muted"
              }`}
            >
              <Video size={10} className="inline mr-1" />
              Player
            </button>
            <button
              onClick={() => setBottomTab("console")}
              className={`px-2 py-0.5 font-mono text-[10px] uppercase transition-colors ${
                bottomTab === "console"
                  ? "text-accent-green border-b border-accent-green"
                  : "text-text-dim hover:text-text-muted"
              }`}
            >
              <Terminal size={10} className="inline mr-1" />
              Console
              {entries.length > 0 && (
                <span className="ml-1 text-[8px] text-accent-blue">
                  {entries.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-bg">
        {bottomTab === "player" ? (
          /* Simple Player View */
          <div className="h-full flex flex-col justify-center items-center px-6 gap-6">
            
            {/* Timestamp & Seek Bar */}
            <div className="w-full max-w-4xl flex items-center gap-4">
              <span className="font-mono text-[12px] text-accent-green w-16 text-right">
                {formatTime(currentTime)}
              </span>
              
              <div 
                className="flex-1 h-3 bg-bg-surface rounded-full overflow-hidden cursor-pointer relative group"
                onClick={handleSeek}
              >
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-accent-blue transition-all group-hover:bg-accent-green" 
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} 
                />
              </div>
              
              <span className="font-mono text-[12px] text-text-dim w-16">
                {formatTime(duration)}
              </span>
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={stepBackward}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-surface rounded-full transition-all"
                title="Step Backward"
              >
                <SkipBack size={18} />
              </button>
              
              <button
                onClick={() => { setIsPlaying(false); goToStart(); }}
                className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-all"
                title="Stop"
              >
                <Square size={18} className="fill-current" />
              </button>
              
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-4 rounded-full transition-all shadow-lg ${
                  isPlaying 
                    ? "bg-accent-green text-bg hover:bg-accent-green/90" 
                    : "bg-accent-blue text-white hover:bg-accent-blue/90"
                }`}
                title="Play/Pause"
              >
                {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
              </button>
              
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-2 rounded-full transition-all ${
                  isLooping 
                    ? "text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20" 
                    : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
                }`}
                title="Toggle Loop"
              >
                <Repeat size={18} />
              </button>

              <button
                onClick={stepForward}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-surface rounded-full transition-all"
                title="Step Forward"
              >
                <SkipForward size={18} />
              </button>
              
              <div className="w-px h-6 bg-border mx-2" />

              <button
                onClick={() => document.dispatchEvent(new CustomEvent("arttrack:save-frame"))}
                className="p-2 text-text-muted hover:text-accent-green hover:bg-accent-green/10 rounded-full transition-all"
                title="Save Frame"
              >
                <Camera size={18} />
              </button>
            </div>
            
            {activeMedia && (
              <div className="absolute bottom-2 left-4 font-mono text-[10px] text-text-dim">
                Active Media: <span className={activeMedia.type === 'video' ? 'text-accent-blue' : 'text-accent-green'}>{activeMedia.name}</span>
              </div>
            )}
          </div>
        ) : (
          /* Console View */
          <div className="h-full flex flex-col">
            {/* Console toolbar */}
            <div className="flex items-center gap-1 px-2 py-0.5 border-b border-border bg-bg shrink-0">
              {(["all", "info", "warn", "error", "success", "timing"] as const).map(
                (level) => (
                  <button
                    key={level}
                    onClick={() => setFilter(level)}
                    className={`px-1.5 py-0 font-mono text-[9px] uppercase transition-colors ${
                      filter === level
                        ? level === "error"
                          ? "text-accent-red"
                          : level === "warn"
                          ? "text-accent-yellow"
                          : level === "success"
                          ? "text-accent-green"
                          : level === "timing"
                          ? "text-accent-blue"
                          : "text-text-primary"
                        : "text-text-dim hover:text-text-muted"
                    }`}
                  >
                    {level}
                  </button>
                )
              )}
              <div className="flex-1" />
              <button
                onClick={clear}
                className="p-0.5 text-text-dim hover:text-accent-red transition-colors"
                title="Clear console"
              >
                <Trash2 size={10} />
              </button>
            </div>

            {/* Console output */}
            <div className="flex-1 overflow-y-auto font-mono text-[10px] bg-bg">
              {filteredEntries.length === 0 && (
                <div className="text-text-dim text-center py-4 text-[9px]">
                  No log entries
                </div>
              )}
              {filteredEntries.map((entry) => (
                <div key={entry.id} className={`console-line console-line-${entry.level}`}>
                  <span className="text-text-dim mr-2">
                    {new Date(entry.timestamp).toLocaleTimeString("en", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  {entry.source && (
                    <span className="text-accent-blue mr-1.5">[{entry.source}]</span>
                  )}
                  {entry.message}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
