"use client";

import React, { useMemo, useState } from "react";
import { useUIStore } from "@/store/UIStore";
import { useEffectStore } from "@/store/EffectStore";
import { useHistoryStore } from "@/store/HistoryStore";
import { pluginRegistry } from "@/engine/core/PluginRegistry";

import { GripVertical, Eye, EyeOff, Trash2, Lock, Unlock, Zap, MoreVertical, Copy, Layers } from "lucide-react";
import { getIconForPlugin, getIconForCategory } from "@/components/ui/PixelIcons";

export default function RightPanel() {
  const { isRightPanelOpen } = useUIStore();
  const { 
    effects, selectedEffectId, updateEffectParam, setSelectedEffect, 
    toggleEffect, removeEffect, reorderEffects, toggleLock,
    duplicateEffect, copyParams, pasteParams, clipboardParams
  } = useEffectStore();
  const { pushState } = useHistoryStore();

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);

  const selectedEffect = useMemo(
    () => effects.find((e) => e.instanceId === selectedEffectId),
    [effects, selectedEffectId]
  );

  const pluginInfo = useMemo(() => {
    if (!selectedEffect) return null;
    const entry = pluginRegistry.get(selectedEffect.id);
    if (!entry) return null;
    const instance = new entry.ctor();
    return { params: instance.getParameters(), name: entry.name, category: entry.category };
  }, [selectedEffect]);

  const handleParamChange = (paramId: string, value: number | boolean | string) => {
    if (!selectedEffect) return;
    
    // Handle Presets natively
    if (paramId === "mode" && pluginInfo) {
      const entry = pluginRegistry.get(selectedEffect.id);
      if (entry) {
        const instance = new entry.ctor();
        if (instance.presets && instance.presets[value as string]) {
          pushState(`Apply Preset ${value}`, effects);
          
          // Apply the preset values
          const presetData = instance.presets[value as string];
          
          // We need to update multiple params. Let's do it directly or via the store
          // For simplicity, we can do it via a bulk update or iterative updates. 
          // But store only has `updateEffectParam`. Let's add a bulk update to the store if needed, 
          // or just update `parameters` object directly and force a re-render.
          
          const newParams = { ...selectedEffect.parameters, ...presetData, mode: value };
          
          useHistoryStore.getState().pushState(`Preset: ${value}`, effects);
          useEffectStore.setState((state) => ({
            effects: state.effects.map(e => 
              e.instanceId === selectedEffect.instanceId 
                ? { ...e, parameters: newParams } 
                : e
            )
          }));
          return;
        }
      }
    }

    pushState(`Change ${paramId}`, effects);
    updateEffectParam(selectedEffect.instanceId, paramId, value);
  };

  const groupedParams = useMemo(() => {
    if (!pluginInfo) return {};
    const groups: Record<string, typeof pluginInfo.params> = {};
    for (const param of pluginInfo.params) {
      const group = param.group || "General";
      if (!groups[group]) groups[group] = [];
      groups[group].push(param);
    }
    return groups;
  }, [pluginInfo]);

  const handleContextMenu = (e: React.MouseEvent, instanceId: string) => {
    e.preventDefault();
    setContextMenu({ id: instanceId, x: e.clientX, y: e.clientY });
  };

  // Close context menu on click outside
  React.useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  if (!isRightPanelOpen) return null;

  return (
    <div className="w-[300px] border-l border-border bg-[#0a0a0a] flex flex-col h-full shrink-0 z-40 select-none">
      
      {/* 1. STACK SECTION */}
      <div className="flex flex-col h-[40%] border-b border-border bg-[#0f0f0f]">
        <div className="px-2 py-1.5 border-b border-border bg-[#121212] flex justify-between items-center shrink-0">
          <h2 className="font-mono font-bold text-[10px] text-text-dim uppercase tracking-wider">
            Active Stack
          </h2>
          <Layers size={12} className="text-text-dim" />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-1">
          {effects.length === 0 ? (
            <div className="text-center font-mono text-[9px] text-text-dim py-6">Empty Stack</div>
          ) : (
            effects.map((e, idx) => {
              const info = pluginRegistry.get(e.id);
              const Icon = getIconForPlugin(e.id) || getIconForCategory(info?.category || "");
              const isSelected = e.instanceId === selectedEffectId;

              return (
                <div 
                  key={e.instanceId} 
                  draggable={!e.locked}
                  onDragStart={() => !e.locked && setDraggedIdx(idx)}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={() => {
                    if (draggedIdx !== null && draggedIdx !== idx && !e.locked) {
                      reorderEffects(draggedIdx, idx);
                    }
                    setDraggedIdx(null);
                  }}
                  onContextMenu={(ev) => handleContextMenu(ev, e.instanceId)}
                  onClick={() => setSelectedEffect(e.instanceId)}
                  className={`flex items-center justify-between h-7 px-1.5 border font-mono text-[10px] cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-accent-blue bg-accent-blue/10 text-white' 
                      : 'border-border bg-[#141414] text-text-muted hover:border-text-dim hover:bg-[#1a1a1a]'
                  } ${e.locked && 'opacity-70'}`}
                >
                  <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
                    <GripVertical size={10} className={`shrink-0 ${e.locked ? 'text-transparent' : 'text-text-dim cursor-grab'}`} />
                    <Icon className={`w-3 h-3 shrink-0 ${isSelected ? 'text-accent-blue' : 'text-text-dim'}`} />
                    <span className={`truncate ${!e.enabled && 'line-through opacity-50'}`}>
                      {info?.name || e.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(ev) => { ev.stopPropagation(); toggleLock(e.instanceId); }}>
                      {e.locked ? <Lock size={10} className="text-text-dim" /> : <Unlock size={10} className="text-transparent group-hover:text-text-dim" />}
                    </button>
                    <button onClick={(ev) => { ev.stopPropagation(); toggleEffect(e.instanceId); }}>
                      {e.enabled ? <Eye size={12} className="text-accent-green" /> : <EyeOff size={12} className="text-text-dim" />}
                    </button>
                    <button onClick={(ev) => { ev.stopPropagation(); removeEffect(e.instanceId); }} className="ml-1 text-transparent group-hover:text-text-dim hover:!text-accent-red transition-colors">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-[#1a1a1a] border border-border shadow-2xl py-1 w-36 font-mono text-[10px] text-text-primary"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full text-left px-3 py-1 hover:bg-accent-blue/20 hover:text-accent-blue" onClick={() => duplicateEffect(contextMenu.id)}>Duplicate</button>
          <button className="w-full text-left px-3 py-1 hover:bg-accent-blue/20 hover:text-accent-blue" onClick={() => copyParams(contextMenu.id)}>Copy Settings</button>
          <button className="w-full text-left px-3 py-1 hover:bg-accent-blue/20 hover:text-accent-blue disabled:opacity-30" disabled={!clipboardParams} onClick={() => pasteParams(contextMenu.id)}>Paste Settings</button>
          <div className="h-px bg-border my-1" />
          <button className="w-full text-left px-3 py-1 text-accent-red hover:bg-accent-red/20" onClick={() => removeEffect(contextMenu.id)}>Delete</button>
        </div>
      )}

      {/* 2. & 3. INSPECTOR (PRESETS & PROPERTIES) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
        {!selectedEffect ? (
           <div className="flex-1 flex flex-col items-center justify-center text-text-dim space-y-2 p-4">
             <div className="w-8 h-8 border border-dashed border-border flex items-center justify-center">
               <Zap size={14} className="opacity-40" />
             </div>
             <p className="font-mono text-[9px] uppercase text-center">Select an effect<br/>to inspect</p>
           </div>
        ) : (
          <>
            {/* Inspector Header */}
            <div className="px-2 py-1.5 border-b border-border bg-[#121212] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5">
                {pluginInfo && React.createElement(getIconForCategory(pluginInfo.category) || getIconForPlugin(selectedEffect.id) as any, { className: "w-3 h-3 text-accent-green" })}
                <h2 className="font-mono font-bold text-[10px] text-accent-green uppercase tracking-wider">
                  {pluginInfo?.name}
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
              


              {/* Properties */}
              {Object.entries(groupedParams).map(([group, params]) => (
                <div key={group} className="space-y-2">
                  <div className="font-mono text-[8px] text-text-dim uppercase tracking-widest border-b border-border/50 pb-0.5">
                    {group}
                  </div>
                  {params.map((param) => {
                    const value = selectedEffect.parameters[param.id] ?? param.defaultValue;

                    if (param.type === "boolean") {
                      return (
                        <div key={param.id} className="flex justify-between items-center py-0.5">
                          <label className="font-mono text-[9px] text-text-secondary uppercase">{param.name}</label>
                          <button
                            onClick={() => handleParamChange(param.id, !value)}
                            className={`w-6 h-3 border transition-colors relative ${value ? "bg-accent-blue/20 border-accent-blue" : "bg-bg border-border"}`}
                          >
                            <div className={`w-2 h-2 absolute top-[1px] transition-all ${value ? "right-[1px] bg-accent-blue" : "left-[1px] bg-text-dim"}`} />
                          </button>
                        </div>
                      );
                    }

                    if (param.type === "number") {
                      return (
                        <div key={param.id} className="space-y-1 py-0.5">
                          <div className="flex justify-between font-mono text-[9px]">
                            <label className="text-text-secondary uppercase">{param.name}</label>
                            <input
                              type="number"
                              value={value as number}
                              min={param.min}
                              max={param.max}
                              step={param.step || 1}
                              onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value) || 0)}
                              className="w-12 text-right text-accent-blue bg-[#121212] px-1 py-0 border border-border font-mono text-[9px] focus:outline-none focus:border-accent-blue"
                            />
                          </div>
                          <input
                            type="range"
                            min={param.min ?? 0}
                            max={param.max ?? 100}
                            step={param.step ?? 1}
                            value={value as number}
                            onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value))}
                            className="w-full accent-accent-blue h-1 bg-border appearance-none"
                          />
                        </div>
                      );
                    }
                    
                    if (param.type === "color") {
                      return (
                        <div key={param.id} className="flex justify-between items-center py-0.5">
                          <label className="font-mono text-[9px] text-text-secondary uppercase">{param.name}</label>
                          <input
                            type="color"
                            value={value as string}
                            onChange={(e) => handleParamChange(param.id, e.target.value)}
                            className="w-12 h-6 p-0 border-0 bg-transparent cursor-pointer"
                          />
                        </div>
                      );
                    }
                    
                    if (param.type === "select") {
                      return (
                        <div key={param.id} className="space-y-1 py-0.5">
                          <label className="block font-mono text-[9px] text-text-secondary uppercase">{param.name}</label>
                          <select
                              value={value as string}
                              onChange={(e) => handleParamChange(param.id, e.target.value)}
                              className="w-full bg-[#121212] border border-border font-mono text-[9px] text-text-primary px-1.5 py-1 focus:outline-none focus:border-accent-blue uppercase"
                          >
                            {param.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
