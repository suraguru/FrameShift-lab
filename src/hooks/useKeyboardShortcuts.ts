"use client";

import { useEffect } from "react";
import { useEffectStore } from "@/store/EffectStore";
import { useHistoryStore } from "@/store/HistoryStore";
import { useTimelineStore } from "@/store/TimelineStore";
import { useUIStore } from "@/store/UIStore";

export function useKeyboardShortcuts() {
  const { effects, setEffects, selectedEffectId, removeEffect } = useEffectStore();
  const { pushState, undo, redo, canUndo, canRedo } = useHistoryStore();
  const { togglePlayback, stepForward, stepBackward } = useTimelineStore();
  const { toggleLeftSidebar, toggleRightPanel, toggleBottomPanel } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't capture shortcuts when typing in inputs
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Ctrl+Z: Undo
      if (ctrl && !shift && e.key === "z") {
        e.preventDefault();
        if (canUndo()) {
          const snapshot = undo();
          if (snapshot) setEffects(snapshot);
        }
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((ctrl && shift && e.key === "z") || (ctrl && e.key === "y")) {
        e.preventDefault();
        if (canRedo()) {
          const snapshot = redo();
          if (snapshot) setEffects(snapshot);
        }
        return;
      }

      // Ctrl+S: Save (handled in TopBar)
      if (ctrl && e.key === "s") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("arttrack:save"));
        return;
      }

      // Space: Play/Pause
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlayback();
        return;
      }

      // Arrow keys: Frame step
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBackward();
        return;
      }

      // Delete: Remove selected effect
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEffectId) {
          e.preventDefault();
          pushState("Remove effect", effects);
          removeEffect(selectedEffectId);
        }
        return;
      }

      // Panel toggles: 1, 2, 3
      if (e.key === "1" && !ctrl) { toggleLeftSidebar(); return; }
      if (e.key === "2" && !ctrl) { toggleRightPanel(); return; }
      if (e.key === "3" && !ctrl) { toggleBottomPanel(); return; }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    effects, selectedEffectId, setEffects, removeEffect,
    pushState, undo, redo, canUndo, canRedo,
    togglePlayback, stepForward, stepBackward,
    toggleLeftSidebar, toggleRightPanel, toggleBottomPanel,
  ]);
}
