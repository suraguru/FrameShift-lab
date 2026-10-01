import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect, SliderControl } from "@/components/ui/CustomControls";
import { Shapes, Maximize, Activity, Target } from "lucide-react";

export default function ImgTrackUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      <div className="flex justify-between items-center bg-bg p-2 border border-border">
        <div className="flex items-center gap-1.5 text-text-muted">
          Manual Mode <span className="bg-bg border border-border px-1 text-[8px]">New</span>
        </div>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" className="accent-accent-green" /> Enable
        </label>
      </div>

      <div>
        <SectionHeader icon={Shapes} title="Shape" />
        <GridSelect
          columns={3}
          value={(p.shape as string) || "circle"}
          onChange={(v) => setParam("shape", v)}
          options={[
            { label: "Square", value: "square" },
            { label: "Circle", value: "circle" },
            { label: "Line", value: "line" },
          ]}
        />
      </div>

      <div>
        <SectionHeader title="Region Style" />
        <div className="text-[8px] text-text-dim mb-1">Basic Effects</div>
        <GridSelect
          columns={3}
          value={(p.regionStyle as string) || "basic"}
          onChange={(v) => setParam("regionStyle", v)}
          options={[
            { label: "Basic", value: "basic" },
            { label: "Cross", value: "cross" },
            { label: "Label", value: "label" },
            { label: "Frame", value: "frame" },
            { label: "L-Frame", value: "l-frame" },
            { label: "X-Frame", value: "x-frame" },
            { label: "Grid", value: "grid" },
            { label: "Particle", value: "particle" },
            { label: "Dash", value: "dash" },
            { label: "Scope", value: "scope" },
            { label: "Win2K", value: "win2k" },
            { label: "Label 2", value: "label2" },
          ]}
        />
      </div>

      <div>
        <SectionHeader title="Filter Effects" rightControl={<label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" />Invert</label>} />
        <GridSelect
          columns={3}
          value={(p.filterEffect as string) || "none"}
          onChange={(v) => setParam("filterEffect", v)}
          options={[
            { label: "Inv", value: "inv" },
            { label: "Glitch", value: "glitch" },
            { label: "Thermal", value: "thermal" },
            { label: "Pixel", value: "pixel" },
            { label: "Tone", value: "tone" },
            { label: "Blur", value: "blur" },
            { label: "Dither", value: "dither" },
            { label: "Zoom", value: "zoom" },
            { label: "X-Ray", value: "x-ray" },
            { label: "Water", value: "water" },
            { label: "Mask", value: "mask" },
            { label: "CRT", value: "crt" },
            { label: "Edge", value: "edge" },
          ]}
        />
      </div>

      <div>
        <SectionHeader icon={Activity} title="Connection" rightControl={<label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" />Center Hub</label>} />
        <div className="flex justify-between text-[9px] text-text-dim mb-1">
          <span>Line Style</span>
          <span className="flex items-center gap-1"><input type="checkbox" defaultChecked />Dashed</span>
        </div>
      </div>
    </div>
  );
}
