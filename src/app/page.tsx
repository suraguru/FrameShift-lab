"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import TopBar from "@/components/layout/TopBar";
import LeftSidebar from "@/components/layout/LeftSidebar";
import CenterViewport from "@/components/layout/CenterViewport";
import RightPanel from "@/components/layout/RightPanel";
import BottomPanel from "@/components/layout/BottomPanel";
import StatusBar from "@/components/layout/StatusBar";

export default function Workstation() {
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-text-primary selection:bg-accent-green selection:text-black">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <CenterViewport />
          <BottomPanel />
        </div>
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  );
}
