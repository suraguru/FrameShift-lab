import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, SliderControl } from "@/components/ui/CustomControls";
import { Sun, Palette, Sliders } from "lucide-react";

export default function ToneKitUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <SectionHeader icon={Sun} title="Light" />
        <SliderControl label="Exposure" value={p.exposure as number || 0} min={-100} max={100} onChange={v => setParam("exposure", v)} />
        <SliderControl label="Contrast" value={p.contrast as number || 0} min={-100} max={100} onChange={v => setParam("contrast", v)} />
        <SliderControl label="Highlights" value={p.highlights as number || 0} min={-100} max={100} onChange={v => setParam("highlights", v)} />
        <SliderControl label="Shadows" value={p.shadows as number || 0} min={-100} max={100} onChange={v => setParam("shadows", v)} />
        <SliderControl label="Whites" value={p.whites as number || 0} min={-100} max={100} onChange={v => setParam("whites", v)} />
        <SliderControl label="Blacks" value={p.blacks as number || 0} min={-100} max={100} onChange={v => setParam("blacks", v)} />
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader icon={Sliders} title="Curves & Gamma" />
        <SliderControl label="Gamma" value={p.gamma as number || 1.0} min={0.1} max={3.0} step={0.05} onChange={v => setParam("gamma", v)} />
        <SliderControl label="S-Curve" value={p.curveIntensity as number || 0} min={0} max={100} onChange={v => setParam("curveIntensity", v)} />
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader icon={Palette} title="Color" />
        <SliderControl label="Temperature" value={p.temperature as number || 0} min={-100} max={100} onChange={v => setParam("temperature", v)} />
        <SliderControl label="Tint" value={p.tint as number || 0} min={-100} max={100} onChange={v => setParam("tint", v)} />
        <SliderControl label="Saturation" value={p.saturation as number || 0} min={-100} max={100} onChange={v => setParam("saturation", v)} />
        <SliderControl label="Vibrance" value={p.vibrance as number || 0} min={-100} max={100} onChange={v => setParam("vibrance", v)} />
        <SliderControl label="Hue Rotate" value={p.hueRotate as number || 0} min={0} max={360} suffix="°" onChange={v => setParam("hueRotate", v)} />
      </div>
    </div>
  );
}
