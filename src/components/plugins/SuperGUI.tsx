import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SliderControl, SectionHeader } from "@/components/ui/CustomControls";
import { Sparkles, Sun } from "lucide-react";

export default function SuperGUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <SectionHeader icon={Sparkles} title="Enhancement" />
        <SliderControl
          label="Sharpen Amount"
          value={(p.sharpenAmount as number) ?? 0.5}
          min={0} max={2} step={0.05}
          onChange={(v) => setParam("sharpenAmount", v)}
        />
        <SliderControl
          label="Sharpen Radius"
          value={(p.sharpenRadius as number) ?? 1}
          min={0.5} max={5} step={0.1}
          onChange={(v) => setParam("sharpenRadius", v)}
        />
        <SliderControl
          label="Local Contrast"
          value={(p.detailRecovery as number) ?? 0.3}
          min={0} max={1} step={0.05}
          onChange={(v) => setParam("detailRecovery", v)}
        />
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader icon={Sun} title="Bloom (Glow)" />
        <SliderControl
          label="Glow Amount"
          value={(p.glowAmount as number) ?? 0.2}
          min={0} max={1} step={0.05}
          onChange={(v) => setParam("glowAmount", v)}
        />
        <SliderControl
          label="Glow Radius"
          value={(p.glowRadius as number) ?? 10}
          min={2} max={50} step={1}
          onChange={(v) => setParam("glowRadius", v)}
        />
      </div>
    </div>
  );
}
