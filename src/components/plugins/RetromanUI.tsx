import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect, SliderControl, ColorPalette } from "@/components/ui/CustomControls";
import { Cpu, Layers, Sun, Contrast, Maximize, Palette } from "lucide-react";

export default function RetromanUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      {/* Algorithm */}
      <div>
        <SectionHeader icon={Cpu} title="Algorithm" />
        <GridSelect
          columns={2}
          value={(p.algorithm as string) || "bayer"}
          onChange={(v) => setParam("algorithm", v)}
          options={[
            { label: "Bayer", value: "bayer" },
            { label: "Atkinson", value: "atkinson" },
          ]}
        />
      </div>

      {/* Level */}
      <div>
        <SectionHeader icon={Layers} title="Level" />
        <GridSelect
          columns={4}
          value={(p.level as string) || "4x4"}
          onChange={(v) => setParam("level", v)}
          options={[
            { label: "2x2", value: "2x2" },
            { label: "4x4", value: "4x4" },
            { label: "8x8", value: "8x8" },
            { label: "16x16", value: "16x16" },
          ]}
        />
      </div>

      {/* Sliders */}
      <SliderControl
        label="Brightness"
        value={(p.brightness as number) || 0}
        min={-100} max={100}
        onChange={(v) => setParam("brightness", v)}
      />
      
      <SliderControl
        label="Contrast"
        value={(p.contrast as number) || 0}
        min={-100} max={100}
        onChange={(v) => setParam("contrast", v)}
      />

      <SliderControl
        label="Scale"
        value={(p.scale as number) || 1}
        min={0.1} max={5.0} step={0.1} suffix="x"
        onChange={(v) => setParam("scale", v)}
      />

      {/* Color */}
      <div>
        <SectionHeader icon={Palette} title="Color" />
        <ColorPalette
          value={(p.color as string) || "#ff6600"}
          onChange={(v) => setParam("color", v)}
          colors={[
            "#ffffff", "#00ffff", "#00ff99", "#99ff00", "#ffcc00", "#ff6600",
            "#ff00ff", "#cc00ff", "#ff3300", "#990033", "#6600cc", "#0066ff"
          ]}
        />
      </div>
    </div>
  );
}
