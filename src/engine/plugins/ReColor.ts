import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class ReColor implements EffectPlugin {
  readonly id = "recolor";
  readonly name = "ReColor";
  readonly category: EffectCategory = "color";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    hueShift: 0,
    targetHue: 0,
    tolerance: 30, // renamed from targetRange
    softness: 10,  // new
    replacementHue: 180,
    blend: 1.0,    // new
    gradientMap: false,
    gradientColorA: "#000000",
    gradientColorB: "#00FF9C",
    posterize: 0,
    invertColors: false,
    sepia: 0,
  };

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "hueShift", name: "Hue Shift", type: "number", defaultValue: 0, min: 0, max: 360, step: 1, group: "Global" },
      { id: "sepia", name: "Sepia", type: "number", defaultValue: 0, min: 0, max: 100, step: 1, group: "Global" },
      { id: "invertColors", name: "Invert", type: "boolean", defaultValue: false, group: "Global" },
      { id: "posterize", name: "Posterize", type: "number", defaultValue: 0, min: 0, max: 16, step: 1, group: "Global" },
      { id: "targetHue", name: "Target Hue", type: "number", defaultValue: 0, min: 0, max: 360, step: 1, group: "Selective" },
      { id: "tolerance", name: "Tolerance", type: "number", defaultValue: 30, min: 1, max: 180, step: 1, group: "Selective" },
      { id: "softness", name: "Softness", type: "number", defaultValue: 10, min: 0, max: 90, step: 1, group: "Selective" },
      { id: "replacementHue", name: "Replace Hue", type: "number", defaultValue: 180, min: 0, max: 360, step: 1, group: "Selective" },
      { id: "blend", name: "Blend", type: "number", defaultValue: 1.0, min: 0, max: 1, step: 0.05, group: "Selective" },
      { id: "gradientMap", name: "Gradient Map", type: "boolean", defaultValue: false, group: "Gradient" },
      { id: "gradientColorA", name: "Gradient Dark", type: "color", defaultValue: "#000000", group: "Gradient" },
      { id: "gradientColorB", name: "Gradient Light", type: "color", defaultValue: "#00FF9C", group: "Gradient" },
    ];
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1/3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1/3) * 255),
    ];
  }

  private hexToRgb(hex: string): [number, number, number] {
    const v = parseInt(hex.replace("#", ""), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    _ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const w = output.width, h = output.height;
    const hueShift = this.parameters.hueShift as number;
    const sepia = this.parameters.sepia as number;
    const invertColors = this.parameters.invertColors as boolean;

    // Apply CSS filter for fast operations
    const filters: string[] = [];
    if (hueShift !== 0) filters.push(`hue-rotate(${hueShift}deg)`);
    if (sepia > 0) filters.push(`sepia(${sepia}%)`);
    if (invertColors) filters.push("invert(100%)");

    outCtx.filter = filters.length > 0 ? filters.join(" ") : "none";
    outCtx.drawImage(input, 0, 0);
    outCtx.filter = "none";

    // Pixel-level operations
    const targetHue = this.parameters.targetHue as number;
    const tolerance = this.parameters.tolerance as number;
    const softness = this.parameters.softness as number;
    const replacementHue = this.parameters.replacementHue as number;
    const blend = this.parameters.blend as number;
    const gradientMap = this.parameters.gradientMap as boolean;
    const posterize = this.parameters.posterize as number;

    const needsPixelProcessing = tolerance < 180 || gradientMap || posterize > 0;
    if (!needsPixelProcessing) return;

    const imgData = outCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const gradColorA = this.hexToRgb(this.parameters.gradientColorA as string);
    const gradColorB = this.hexToRgb(this.parameters.gradientColorB as string);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];

      // Selective color replacement with softness and blend
      if (tolerance < 180 && blend > 0) {
        const [pixH, pixS, pixL] = this.rgbToHsl(r, g, b);
        let hueDiff = Math.abs(pixH - targetHue);
        if (hueDiff > 180) hueDiff = 360 - hueDiff;
        
        // Calculate influence based on tolerance and softness
        let influence = 0;
        if (hueDiff <= tolerance) {
          influence = 1.0;
        } else if (hueDiff <= tolerance + softness && softness > 0) {
          influence = 1.0 - (hueDiff - tolerance) / softness;
        }

        // Apply blend
        influence *= blend;

        if (influence > 0 && pixS > 0.05) {
          // shift the hue smoothly
          const hueDelta = (replacementHue - targetHue);
          let newHue = (pixH + hueDelta * influence);
          if (newHue < 0) newHue += 360;
          newHue = newHue % 360;
          
          [r, g, b] = this.hslToRgb(newHue, pixS, pixL);
        }
      }

      // Gradient mapping
      if (gradientMap) {
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        r = Math.round(gradColorA[0] + (gradColorB[0] - gradColorA[0]) * lum);
        g = Math.round(gradColorA[1] + (gradColorB[1] - gradColorA[1]) * lum);
        b = Math.round(gradColorA[2] + (gradColorB[2] - gradColorA[2]) * lum);
      }

      // Posterize
      if (posterize > 0) {
        const levels = posterize;
        r = Math.round(Math.round(r / 255 * levels) / levels * 255);
        g = Math.round(Math.round(g / 255 * levels) / levels * 255);
        b = Math.round(Math.round(b / 255 * levels) / levels * 255);
      }

      data[i] = r; data[i + 1] = g; data[i + 2] = b;
    }

    outCtx.putImageData(imgData, 0, 0);
  }

  serialize(): SerializedEffect {
    return { id: this.id, instanceId: this.instanceId, enabled: this.enabled, parameters: { ...this.parameters } };
  }
  deserialize(data: SerializedEffect): void {
    this.instanceId = data.instanceId; this.enabled = data.enabled;
    this.parameters = { ...this.parameters, ...data.parameters };
  }
  destroy(): void {}
}

pluginRegistry.register("recolor", "ReColor", "color", ReColor);
