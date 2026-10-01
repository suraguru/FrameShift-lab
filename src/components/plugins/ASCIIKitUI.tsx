import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect, SliderControl } from "@/components/ui/CustomControls";
import { Hash, Type, Search, MoveHorizontal, MoveVertical, Contrast } from "lucide-react";

export default function ASCIIKitUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      {/* Character Sequence */}
      <div>
        <SectionHeader icon={Hash} title="Character Sequence" />
        <GridSelect
          columns={3}
          value={(p.sequence as string) || "binary"}
          onChange={(v) => setParam("sequence", v)}
          options={[
            { label: "Standard", value: "standard" },
            { label: "Blocks", value: "blocks" },
            { label: "Simple", value: "simple" },
            { label: "Binary", value: "binary" },
            { label: "Dense", value: "dense" },
            { label: "Minimal", value: "minimal" },
            { label: "Retro", value: "retro" },
            { label: "Symbols", value: "symbols" },
            { label: "Custom", value: "custom" },
          ]}
        />
      </div>

      {/* Font Family */}
      <div>
        <SectionHeader icon={Type} title="Font Family" />
        <GridSelect
          columns={2}
          value={(p.fontFamily as string) || "monospace"}
          onChange={(v) => setParam("fontFamily", v)}
          options={[
            { label: "Monospace", value: "monospace" },
            { label: "Courier...", value: "courier" },
            { label: "Consolas", value: "consolas" },
            { label: "Lucida C...", value: "lucida" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer text-text-muted">
          <input type="checkbox" checked={p.monochrome as boolean} onChange={(e) => setParam("monochrome", e.target.checked)} className="accent-accent-green" /> Monochrome
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-text-muted">
          <input type="checkbox" checked={p.invert as boolean} onChange={(e) => setParam("invert", e.target.checked)} className="accent-accent-green" /> Invert
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-text-muted">
          <input type="checkbox" checked={p.edgeEnhanced as boolean} onChange={(e) => setParam("edgeEnhanced", e.target.checked)} className="accent-accent-green" /> Edge Enhanced
        </label>
      </div>

      {/* Sliders */}
      <SliderControl
        label="Font Scale"
        value={(p.fontScale as number) || 1.0}
        min={0.1} max={3.0} step={0.01} suffix="x"
        onChange={(v) => setParam("fontScale", v)}
      />
      
      <SliderControl
        label="Character Spacing"
        value={(p.charSpacing as number) || 1.0}
        min={0.5} max={3.0} step={0.1}
        onChange={(v) => setParam("charSpacing", v)}
      />

      <SliderControl
        label="Line Height"
        value={(p.lineHeight as number) || 1.2}
        min={0.5} max={3.0} step={0.1}
        onChange={(v) => setParam("lineHeight", v)}
      />

      <SliderControl
        label="Contrast"
        value={(p.contrast as number) || 1.0}
        min={0.0} max={3.0} step={0.1}
        onChange={(v) => setParam("contrast", v)}
      />
    </div>
  );
}
