import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect, SliderControl } from "@/components/ui/CustomControls";
import { Sparkles } from "lucide-react";

export default function GlassifyUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <SectionHeader icon={Sparkles} title="Effect" />
        <GridSelect
          columns={3}
          value={(p.effect as string) || "radial"}
          onChange={(v) => setParam("effect", v)}
          options={[
            { label: "None", value: "none" },
            { label: "Radial", value: "radial" },
            { label: "Glitch", value: "glitch" },
            { label: "Stripe", value: "stripe" },
            { label: "Organic", value: "organic" },
            { label: "Ripple", value: "ripple" },
          ]}
        />
      </div>

      <SliderControl
        label="Layer"
        value={(p.layer as number) || 8}
        min={1} max={32}
        onChange={(v) => setParam("layer", v)}
      />

      <SliderControl
        label="Offset"
        value={(p.offset as number) || 5}
        min={0} max={50}
        onChange={(v) => setParam("offset", v)}
      />

      <SliderControl
        label="Rotation"
        value={(p.rotation as number) || 0.2}
        min={0} max={3.14} step={0.01}
        onChange={(v) => setParam("rotation", v)}
      />

      <SliderControl
        label="Radius"
        value={(p.radius as number) || 0.3}
        min={0.1} max={2.0} step={0.01}
        onChange={(v) => setParam("radius", v)}
      />

      <SliderControl
        label="Shadow Strength"
        value={(p.shadowStrength as number) || 0.3}
        min={0} max={1.0} step={0.01}
        onChange={(v) => setParam("shadowStrength", v)}
      />

      <SliderControl
        label="Shadow Width"
        value={(p.shadowWidth as number) || 0.05}
        min={0} max={0.2} step={0.001}
        onChange={(v) => setParam("shadowWidth", v)}
      />
    </div>
  );
}
