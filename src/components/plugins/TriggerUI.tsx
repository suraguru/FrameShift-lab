import React from "react";
import { useEffectStore } from "@/store/EffectStore";
import { SectionHeader, GridSelect } from "@/components/ui/CustomControls";
import { Music, Wand2 } from "lucide-react";

export default function TriggerUI({ instanceId }: { instanceId: string }) {
  const { effects, updateEffectParam } = useEffectStore();
  const effect = effects.find((e) => e.instanceId === instanceId);

  if (!effect) return null;

  const p = effect.parameters;
  const setParam = (key: string, value: any) => updateEffectParam(instanceId, key, value);

  return (
    <div className="p-3 space-y-4 font-mono text-[10px]">
      {/* Audio */}
      <div>
        <SectionHeader icon={Music} title="Audio" />
        <GridSelect
          columns={3}
          value={(p.audio as string) || "beats"}
          onChange={(v) => setParam("audio", v)}
          options={[
            { label: "Beats", value: "beats" },
            { label: "Error", value: "error" },
            { label: "Bird", value: "bird" },
          ]}
        />
        <button className="w-full mt-1 bg-bg-surface border border-border text-text-muted py-1.5 hover:text-white transition-colors">
          Upload Audio
        </button>
      </div>

      {/* Effects */}
      <div>
        <SectionHeader
          icon={Wand2}
          title="Effects"
          rightControl={
            <label className="flex items-center gap-1 text-text-dim cursor-pointer">
              <input type="checkbox" className="accent-accent-green" defaultChecked /> Select All
            </label>
          }
        />
        <GridSelect
          columns={2}
          value={(p.activeEffect as string) || "none"}
          onChange={(v) => setParam("activeEffect", v)}
          options={[
            { label: "None", value: "none" },
            { label: "Pixelate", value: "pixelate" },
            { label: "Scanlines", value: "scanlines" },
            { label: "Chroma", value: "chroma" },
            { label: "Wave", value: "wave" },
            { label: "Dither", value: "dither" },
            { label: "Crosshatch", value: "crosshatch" },
            { label: "Thermal", value: "thermal" },
            { label: "X-Ray", value: "x-ray" },
            { label: "Invert", value: "invert" },
            { label: "Glitch", value: "glitch" },
            { label: "Halftone", value: "halftone" },
            { label: "Edge", value: "edge" },
            { label: "ASCII", value: "ascii" },
          ]}
        />
      </div>

      <div className="text-[8px] text-text-dim leading-relaxed border-t border-border pt-2">
        Exporting while audio is playing may cause screen flickering — this might be a bug, but the result is quite interesting. If you'd prefer not to see this, pause the audio before exporting.
      </div>
    </div>
  );
}
