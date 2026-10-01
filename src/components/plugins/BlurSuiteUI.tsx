import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect, SliderControl } from "@/components/ui/CustomControls";
import { Move, Droplet, Sun, Zap } from "lucide-react";

export default function BlurSuiteUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <SectionHeader icon={Move} title="Mode" />
        <GridSelect
          columns={3}
          value={(p.mode as string) || "radial"}
          onChange={(v) => setParam("mode", v)}
          options={[
            { label: "Linear", value: "linear" },
            { label: "Radial", value: "radial" },
            { label: "Zoom", value: "zoom" },
            { label: "Wave", value: "wave" },
            { label: "T B", value: "tb" },
            { label: "L R", value: "lr" },
          ]}
        />
      </div>

      <SliderControl
        label="Blur Strength"
        value={(p.strength as number) || 0.5}
        min={0} max={1.0} step={0.01}
        onChange={(v) => setParam("strength", v)}
      />

      <SliderControl
        label="Grain"
        value={(p.grain as number) || 0.1}
        min={0} max={1.0} step={0.01}
        onChange={(v) => setParam("grain", v)}
      />

      <SliderControl
        label="RGB Shift"
        value={(p.rgbShift as number) || 0.05}
        min={0} max={0.5} step={0.01}
        onChange={(v) => setParam("rgbShift", v)}
      />

      <div className="flex justify-between items-center bg-bg-surface p-2 border border-border">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Sun size={12} /> Bloom
        </div>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" className="accent-accent-green" /> Bloom
        </label>
      </div>

      <div>
        <SectionHeader icon={Droplet} title="Motion Center" />
        <SliderControl
          label="X Axis"
          value={(p.centerX as number) || 0.5}
          min={0} max={1.0} step={0.01}
          onChange={(v) => setParam("centerX", v)}
        />
        <SliderControl
          label="Y Axis"
          value={(p.centerY as number) || 0.5}
          min={0} max={1.0} step={0.01}
          onChange={(v) => setParam("centerY", v)}
        />
      </div>
    </div>
  );
}
