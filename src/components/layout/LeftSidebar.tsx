"use client";

import React, { useState, useMemo } from "react";
import { useUIStore } from "@/store/UIStore";
import { useEffectStore } from "@/store/EffectStore";
import { pluginRegistry } from "@/engine/core/PluginRegistry";
import "@/engine/plugins"; // Ensure plugins are registered in the main thread
import { Search } from "lucide-react";
import { getIconForCategory, getIconForPlugin } from "@/components/ui/PixelIcons";

export default function LeftSidebar() {
  const { isLeftSidebarOpen } = useUIStore();
  const { addEffect, effects, selectedEffectId } = useEffectStore();
  const [searchQuery, setSearchQuery] = useState("");

  const activeEffect = effects.find(e => e.instanceId === selectedEffectId);

  const plugins = pluginRegistry.getAll();

  const filteredPlugins = useMemo(() => {
    if (!searchQuery) return plugins;
    const q = searchQuery.toLowerCase().replace(/\s+/g, "");
    return plugins.filter((p) => {
      const nameMatch = p.name.toLowerCase().replace(/\s+/g, "").includes(q);
      const idMatch = p.id.toLowerCase().replace(/\s+/g, "").includes(q);
      const catMatch = p.category.toLowerCase().replace(/\s+/g, "").includes(q);
      return nameMatch || idMatch || catMatch;
    });
  }, [plugins, searchQuery]);

  // Group plugins by category and enforce screenshot order
  const categories = useMemo(() => {
    const groups: Record<string, typeof plugins> = {};
    filteredPlugins.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    
    // Sort items within categories exactly as shown in screenshot
    const itemSortOrder = [
      "BabyTrack", "ImageTrack",
      "ToneKit", "ReColor",
      "ASCIIKit", "Retroman", "Scanline",
      "TriggerWave", "Glassify", "BlurSuite",
      "LoopFlow",
      "Super-G"
    ];
    
    for (const cat in groups) {
      groups[cat].sort((a, b) => {
        let indexA = itemSortOrder.indexOf(a.name);
        let indexB = itemSortOrder.indexOf(b.name);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
      });
    }

    return groups;
  }, [filteredPlugins]);

  // Enforce category order exactly as shown in screenshot
  const categoryOrder = ["tracking", "color", "retro", "distortion", "motion", "ai"];
  
  const sortedCategories = useMemo(() => {
    return Object.entries(categories).sort(([catA], [catB]) => {
      let indexA = categoryOrder.indexOf(catA.toLowerCase());
      let indexB = categoryOrder.indexOf(catB.toLowerCase());
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      return indexA - indexB;
    });
  }, [categories]);

  if (!isLeftSidebarOpen) return null;

  const handleAddTool = (pluginId: string) => {
    const instance = pluginRegistry.createInstance(pluginId);
    if (instance) {
      addEffect(instance.serialize());
    }
  };

  return (
    <div className="w-56 border-r border-border bg-[#0a0a0a] flex flex-col h-full shrink-0 z-40 overflow-hidden">
      {/* Search Bar */}
      <div className="p-2 border-b border-border bg-[#0f0f0f] shrink-0">
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-border px-1.5 py-1">
          <Search size={12} className="text-text-dim" />
          <input
            type="text"
            placeholder="Search filters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-[10px] font-mono text-text-primary w-full focus:outline-none placeholder:text-text-dim ml-1"
          />
        </div>
      </div>

      {/* Filter Library List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#090909]">
        
        {/* Main Header matching screenshot */}
        {!searchQuery && (
          <div className="px-4 py-2 text-[10px] font-mono text-[#777777] border-b border-white/5 uppercase tracking-wide">
            PROCESSING MODULES
          </div>
        )}

        {sortedCategories.map(([category, items]) => (
          <div key={category} className="mb-0">
            <div className="px-4 pt-4 pb-2 text-[9px] font-mono uppercase text-[#555555] tracking-widest">
              {category}
            </div>
            <div className="flex flex-col">
              {items.map((plugin) => {
                const Icon = getIconForPlugin(plugin.id) || getIconForCategory(category);
                const isSelected = activeEffect?.id === plugin.id;
                
                return (
                  <button
                    key={plugin.id}
                    onClick={() => handleAddTool(plugin.id)}
                    className={`flex items-center gap-4 h-9 px-4 transition-colors text-left group ${
                      isSelected 
                        ? "bg-[#181818] border-y border-white/5 text-[#00e5ff] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" 
                        : "text-[#999999] hover:bg-[#121212] hover:text-[#cccccc] border-y border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isSelected ? "text-[#00e5ff]" : "text-[#666666] group-hover:text-[#999999]"
                    }`} />
                    <span className="font-mono text-[11px] truncate tracking-wide">{plugin.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filteredPlugins.length === 0 && (
          <div className="p-4 text-center text-[#444444] text-[10px] font-mono">
            No filters found.
          </div>
        )}
      </div>
    </div>
  );
}
