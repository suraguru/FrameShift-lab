import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, SliderControl, ColorPalette } from "@/components/ui/CustomControls";
import { Maximize, Edit2, RotateCw, Play, Palette, RefreshCcw } from "lucide-react";

export default function LoopFlowUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <SectionHeader icon={Maximize} title="Region" />
        <div className="grid grid-cols-2 gap-1 mb-2">
          <button className="bg-bg border border-transparent text-text-dim py-1.5 flex items-center justify-center gap-1"><Maximize size={10}/> Auto</button>
          <button className="bg-bg-hover border border-border-light text-text-primary py-1.5 flex items-center justify-center gap-1"><Edit2 size={10}/> Draw</button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-text-dim mb-1"><Edit2 size={10}/> Region defined</div>
        <button className="w-full bg-bg border border-border text-text-dim py-1.5 flex items-center justify-center gap-1 hover:text-white transition-colors">
          <RefreshCcw size={10}/> Reset Region
        </button>
      </div>

      <div>
        <SectionHeader icon={RotateCw} title="Transform" />
        <div className="grid grid-cols-2 gap-1 mb-2">
          <button className="bg-bg-hover border border-border-light text-text-primary py-1.5 flex items-center justify-center gap-1"><RotateCw size={10}/> Droste</button>
          <button className="bg-bg border border-transparent text-text-dim py-1.5 flex items-center justify-center gap-1">Twisted</button>
        </div>
      </div>

      <div>
        <SectionHeader icon={Play} title="Animation" />
        <SliderControl
          label="Zoom"
          value={(p.zoom as number) || 1.0}
          min={0.1} max={5.0} step={0.01}
          onChange={(v) => setParam("zoom", v)}
        />
        <SliderControl
          label="Speed"
          value={(p.speed as number) || 0.3}
          min={0} max={2.0} step={0.01}
          onChange={(v) => setParam("speed", v)}
        />
      </div>

      <div>
        <SectionHeader icon={Palette} title="Background" />
        <ColorPalette
          value={(p.color as string) || "#ffffff"}
          onChange={(v) => setParam("color", v)}
          colors={[
            "#ffffff", "#000000", "#00ffff", "#00ff99", "#99ff00", "#ffcc00", "#ff6600",
            "#ff00ff", "#cc00ff", "#ff3300", "#990033", "#6600cc", "#0066ff"
          ]}
        />
      </div>
    </div>
  );
}
