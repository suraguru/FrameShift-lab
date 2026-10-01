import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect, SliderControl } from "@/components/ui/CustomControls";
import { Shapes, Maximize, Activity, Type, Target } from "lucide-react";

export default function BabyTrackUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      {/* Shape */}
      <div>
        <SectionHeader icon={Shapes} title="Shape" />
        <GridSelect
          columns={3}
          value={(p.shape as string) || "square"}
          onChange={(v) => setParam("shape", v)}
          options={[
            { label: "Square", value: "square" },
            { label: "Circle", value: "circle" },
            { label: "Line", value: "line" },
          ]}
        />
      </div>

      {/* Region Style */}
      <div>
        <SectionHeader
          icon={Maximize}
          title="Region Style"
          rightControl={
            <label className="flex items-center gap-1 text-text-dim cursor-pointer">
              <input type="checkbox" className="accent-accent-green" />
              Random
            </label>
          }
        />
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
            { label: "Glow", value: "glow" },
            { label: "Backdrop", value: "backdrop" },
          ]}
        />
      </div>

      {/* Filter Effects */}
      <div>
        <SectionHeader
          title="Filter Effects"
          rightControl={
            <div className="flex gap-2 text-text-dim">
              <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" />Invert</label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" />Fusion</label>
            </div>
          }
        />
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

      {/* Blink */}
      <div className="flex justify-between items-center bg-bg-surface p-2 border border-border">
        <div className="flex items-center gap-1.5 text-text-muted font-bold">
          <Activity size={12} /> Blink <span className="bg-bg border border-border px-1 text-[8px]">New</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" className="accent-accent-green w-3 h-3" />
        </div>
      </div>

      {/* Connection */}
      <div>
        <SectionHeader
          icon={Activity}
          title="Connection"
          rightControl={
            <label className="flex items-center gap-1 text-text-dim cursor-pointer">
              <input type="checkbox" /> Center Hub
            </label>
          }
        />
        <div className="flex justify-between text-[9px] text-text-dim mb-1">
          <span>Line Style</span>
          <span className="flex items-center gap-1">
            <input type="checkbox" /> Dashed
          </span>
        </div>
        <GridSelect
          columns={4}
          value={(p.lineStyle as string) || "solid"}
          onChange={(v) => setParam("lineStyle", v)}
          options={[
            { label: "/", value: "solid" },
            { label: "~", value: "wavy" },
            { label: "||", value: "broken" },
            { label: "v", value: "heartbeat" },
          ]}
        />
        <div className="text-[9px] text-text-dim mt-2 mb-1">Connection Rate</div>
        <GridSelect
          columns={5}
          value={p.connectionRate?.toString() || "0.25"}
          onChange={(v) => setParam("connectionRate", parseFloat(v))}
          options={[
            { label: "0", value: "0" },
            { label: "0.25", value: "0.25" },
            { label: "0.5", value: "0.5" },
            { label: "0.75", value: "0.75" },
            { label: "1", value: "1" },
          ]}
        />
      </div>

      {/* Stroke Width */}
      <SliderControl
        label="Stroke Width"
        value={(p.strokeWidth as number) || 1}
        min={1} max={10}
        suffix="px"
        onChange={(v) => setParam("strokeWidth", v)}
      />

      {/* Bounding Size */}
      <div>
        <SectionHeader
          icon={Target}
          title="Bounding Size"
          rightControl={
            <label className="flex items-center gap-1 text-text-dim cursor-pointer">
              <input type="checkbox" /> Same Size
            </label>
          }
        />
        <GridSelect
          columns={6}
          value={p.boundingSize?.toString() || "128"}
          onChange={(v) => setParam("boundingSize", parseFloat(v))}
          options={[
            { label: "0", value: "0" },
            { label: "32", value: "32" },
            { label: "64", value: "64" },
            { label: "128", value: "128" },
            { label: "256", value: "256" },
            { label: "512", value: "512" },
          ]}
        />
      </div>

      {/* Blob Count Control */}
      <div>
        <SectionHeader icon={Target} title="Blob Count Control" />
        <div className="grid grid-cols-2 gap-1 mb-2">
          <button className="bg-bg-hover border border-border-light text-text-primary py-1 text-center">By Size</button>
          <button className="bg-bg border border-transparent text-text-dim py-1 text-center">By Count</button>
        </div>
        <GridSelect
          columns={6}
          value={p.blobLimit?.toString() || "64"}
          onChange={(v) => setParam("blobLimit", parseFloat(v))}
          options={[
            { label: "16", value: "16" },
            { label: "32", value: "32" },
            { label: "64", value: "64" },
            { label: "128", value: "128" },
            { label: "256", value: "256" },
            { label: "512", value: "512" },
          ]}
        />
      </div>
    </div>
  );
}
