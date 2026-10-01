import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect, SliderControl, ToggleControl } from "@/components/ui/CustomControls";
import { Tv, Activity, Grid, Monitor } from "lucide-react";

export default function ScanlineUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div>
        <SectionHeader icon={Tv} title="Preset" />
        <GridSelect
          columns={4}
          value={(p.preset as string) || "full"}
          onChange={(v) => setParam("preset", v)}
          options={[
            { label: "Full", value: "full" },
            { label: "Analog", value: "analog" },
            { label: "Digital", value: "digital" },
            { label: "Subtle", value: "subtle" },
          ]}
        />
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader
          icon={Activity}
          title="Analog"
          rightControl={<ToggleControl label="Enable" value={p.enableAnalog as boolean ?? true} onChange={(v) => setParam("enableAnalog", v)} />}
        />
        <SliderControl label="Intensity" value={p.analogIntensity as number || 0.5} min={0} max={1} onChange={v => setParam("analogIntensity", v)} />
        <SliderControl label="Chroma" value={p.analogChroma as number || 0.5} min={0} max={1} onChange={v => setParam("analogChroma", v)} />
        <SliderControl label="Tracking Speed" value={p.analogTracking as number || 0.5} min={0} max={1} onChange={v => setParam("analogTracking", v)} />
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader
          icon={Grid}
          title="Digital"
          rightControl={<ToggleControl label="Enable" value={p.enableDigital as boolean ?? true} onChange={(v) => setParam("enableDigital", v)} />}
        />
        <SliderControl label="Block Speed" value={p.digitalSpeed as number || 0.5} min={0} max={1} onChange={v => setParam("digitalSpeed", v)} />
        <SliderControl label="Block Coverage" value={p.digitalCoverage as number || 0.5} min={0} max={1} onChange={v => setParam("digitalCoverage", v)} />
      </div>

      <div className="border-t border-border pt-3">
        <SectionHeader
          icon={Monitor}
          title="CRT"
          rightControl={<ToggleControl label="Enable" value={p.enableCrt as boolean ?? true} onChange={(v) => setParam("enableCrt", v)} />}
        />
        <SliderControl label="Curvature" value={p.crtCurvature as number || 0.5} min={0} max={1} onChange={v => setParam("crtCurvature", v)} />
      </div>
    </div>
  );
}
