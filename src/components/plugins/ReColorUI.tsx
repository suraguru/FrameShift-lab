import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, SliderControl } from "@/components/ui/CustomControls";
import { Palette, Layers, Scissors } from "lucide-react";

export default function ReColorUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <SectionHeader icon={Layers} title="Global Adjustments" />
        <SliderControl label="Hue Shift" value={p.hueShift as number || 0} min={0} max={360} suffix="°" onChange={(v) => setParam("hueShift", v)} />
        <SliderControl label="Sepia" value={p.sepia as number || 0} min={0} max={100} suffix="%" onChange={(v) => setParam("sepia", v)} />
        <SliderControl label="Posterize" value={p.posterize as number || 0} min={0} max={16} onChange={(v) => setParam("posterize", v)} />
        
        <div className="flex gap-4 mt-2">
           <label className="flex items-center gap-1 cursor-pointer text-text-muted">
             <input type="checkbox" checked={p.invertColors as boolean} onChange={(e) => setParam("invertColors", e.target.checked)} className="accent-accent-green" /> Invert Colors
           </label>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader icon={Scissors} title="Selective Replace" />
        <SliderControl label="Target Hue" value={p.targetHue as number || 0} min={0} max={360} suffix="°" onChange={(v) => setParam("targetHue", v)} />
        <SliderControl label="Tolerance" value={p.tolerance as number || 30} min={1} max={180} suffix="°" onChange={(v) => setParam("tolerance", v)} />
        <SliderControl label="Softness" value={p.softness as number || 10} min={0} max={90} suffix="°" onChange={(v) => setParam("softness", v)} />
        <SliderControl label="Replace Hue" value={p.replacementHue as number || 180} min={0} max={360} suffix="°" onChange={(v) => setParam("replacementHue", v)} />
        <SliderControl label="Blend" value={p.blend as number ?? 1.0} min={0} max={1} step={0.05} onChange={(v) => setParam("blend", v)} />
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader icon={Palette} title="Gradient Map" />
        <div className="flex gap-4 mb-2">
           <label className="flex items-center gap-1 cursor-pointer text-text-muted">
             <input type="checkbox" checked={p.gradientMap as boolean} onChange={(e) => setParam("gradientMap", e.target.checked)} className="accent-accent-green" /> Enable Gradient Map
           </label>
        </div>
        <div className="flex gap-2 items-center">
          <input type="color" value={(p.gradientColorA as string) || "#000000"} onChange={(e) => setParam("gradientColorA", e.target.value)} /> Dark
          <input type="color" value={(p.gradientColorB as string) || "#00FF9C"} onChange={(e) => setParam("gradientColorB", e.target.value)} /> Light
        </div>
      </div>
    </div>
  );
}
