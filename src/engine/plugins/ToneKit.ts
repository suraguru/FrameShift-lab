import type {
  EffectPlugin,
  EffectParameter,
  EffectCategory,
  RenderContext,
  SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class ToneKit implements EffectPlugin {
  readonly id = "tonekit";
  readonly name = "ToneKit";
  readonly category: EffectCategory = "color";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    saturation: 0,
    vibrance: 0,
    hueRotate: 0,
    gamma: 1.0,
    curveIntensity: 0,
    mode: "Custom",
  };

  presets: Record<string, Record<string, any>> = {
    "Kodak Gold": { exposure: 5, contrast: 15, temperature: 10, tint: -5, saturation: 10, gamma: 1.1, curveIntensity: 20 },
    "Fuji 400H": { exposure: 10, contrast: 5, temperature: -5, tint: 10, saturation: -5, gamma: 0.95, curveIntensity: 10, highlights: -10, shadows: 15 },
    "CinePrint": { exposure: -5, contrast: 25, temperature: 0, tint: 5, saturation: -15, gamma: 1.2, curveIntensity: 30, vibrance: 10, blacks: 5 },
    "Documentary": { exposure: 0, contrast: 10, saturation: -20, vibrance: -10, gamma: 1.0, curveIntensity: 0 },
    "Cyberpunk": { exposure: 0, contrast: 30, temperature: -20, tint: 30, saturation: 20, vibrance: 30, gamma: 1.1, curveIntensity: 40, highlights: 20, shadows: -15 },
    "Neon": { exposure: 10, contrast: 40, temperature: -30, tint: 40, saturation: 40, hueRotate: 10, gamma: 1.2 },
    "Custom": {},
  };

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "mode", name: "Preset Mode", type: "select", options: Object.keys(this.presets), defaultValue: "Custom", group: "Profile", basic: true },
      { id: "exposure", name: "Exposure", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Light", basic: true },
      { id: "contrast", name: "Contrast", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Light", basic: true },
      { id: "highlights", name: "Highlights", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Light" },
      { id: "shadows", name: "Shadows", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Light" },
      { id: "whites", name: "Whites", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Light" },
      { id: "blacks", name: "Blacks", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Light" },
      { id: "gamma", name: "Gamma", type: "number", defaultValue: 1.0, min: 0.1, max: 3.0, step: 0.05, group: "Light" },
      { id: "curveIntensity", name: "S-Curve", type: "number", defaultValue: 0, min: 0, max: 100, step: 1, group: "Curves" },
      { id: "temperature", name: "Temperature", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Color", basic: true },
      { id: "tint", name: "Tint", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Color" },
      { id: "saturation", name: "Saturation", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Color", basic: true },
      { id: "vibrance", name: "Vibrance", type: "number", defaultValue: 0, min: -100, max: 100, step: 1, group: "Color" },
      { id: "hueRotate", name: "Hue Rotate", type: "number", defaultValue: 0, min: 0, max: 360, step: 1, group: "Color" },
    ];
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    _ctx: RenderContext
  ): Promise<void> {
    const ctx = output.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    if (!ctx) return;

    const exposure = this.parameters.exposure as number;
    const contrast = this.parameters.contrast as number;
    const highlights = this.parameters.highlights as number;
    const shadows = this.parameters.shadows as number;
    const whites = this.parameters.whites as number;
    const blacks = this.parameters.blacks as number;
    const temperature = this.parameters.temperature as number;
    const tint = this.parameters.tint as number;
    const saturation = this.parameters.saturation as number;
    const vibrance = this.parameters.vibrance as number;
    const hueRotate = this.parameters.hueRotate as number;
    const gamma = this.parameters.gamma as number;
    const curveIntensity = this.parameters.curveIntensity as number;

    // Apply CSS filter-based adjustments first
    const brightness = 100 + exposure;
    const contrastVal = 100 + contrast;
    const saturateVal = 100 + saturation;

    ctx.filter = `brightness(${brightness}%) contrast(${contrastVal}%) saturate(${saturateVal}%) hue-rotate(${hueRotate}deg)`;
    ctx.drawImage(input, 0, 0);
    ctx.filter = "none";

    // Apply pixel-level processing for gamma, curves, temperature, tint, highlights, shadows, vibrance
    if (
      temperature !== 0 ||
      tint !== 0 ||
      highlights !== 0 ||
      shadows !== 0 ||
      whites !== 0 ||
      blacks !== 0 ||
      vibrance !== 0 ||
      gamma !== 1.0 ||
      curveIntensity !== 0
    ) {
      const w = output.width;
      const h = output.height;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const tempShift = temperature * 1.5;
      const tintShift = tint * 0.8;
      const vibranceMul = vibrance / 100;
      const highlightAdj = highlights / 100;
      const shadowAdj = shadows / 100;
      const whiteAdj = whites / 100;
      const blackAdj = blacks / 100;
      const curveMul = curveIntensity / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Gamma Correction
        if (gamma !== 1.0) {
          r = 255 * Math.pow(r / 255, 1 / gamma);
          g = 255 * Math.pow(g / 255, 1 / gamma);
          b = 255 * Math.pow(b / 255, 1 / gamma);
        }

        // Curves (S-Curve)
        if (curveMul !== 0) {
           const applySCurve = (c: number) => {
             const norm = c / 255;
             // basic smoothstep for s-curve
             const sc = norm * norm * (3 - 2 * norm);
             return 255 * (norm + (sc - norm) * curveMul);
           };
           r = applySCurve(r);
           g = applySCurve(g);
           b = applySCurve(b);
        }

        // Temperature (warm = +R -B, cool = -R +B)
        r = Math.min(255, Math.max(0, r + tempShift));
        b = Math.min(255, Math.max(0, b - tempShift));

        // Tint (+ = magenta/red, - = green)
        g = Math.min(255, Math.max(0, g - tintShift));

        // Luminance for tonal adjustments
        const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Highlights (affect bright areas)
        if (lum > 0.5) {
          const factor = (lum - 0.5) * 2;
          const adj = highlightAdj * factor * 40;
          r = Math.min(255, Math.max(0, r + adj));
          g = Math.min(255, Math.max(0, g + adj));
          b = Math.min(255, Math.max(0, b + adj));
        }

        // Shadows (affect dark areas)
        if (lum < 0.5) {
          const factor = (0.5 - lum) * 2;
          const adj = shadowAdj * factor * 40;
          r = Math.min(255, Math.max(0, r + adj));
          g = Math.min(255, Math.max(0, g + adj));
          b = Math.min(255, Math.max(0, b + adj));
        }

        // Whites (lift the brightest tones)
        if (lum > 0.75) {
          const factor = (lum - 0.75) * 4;
          const adj = whiteAdj * factor * 30;
          r = Math.min(255, Math.max(0, r + adj));
          g = Math.min(255, Math.max(0, g + adj));
          b = Math.min(255, Math.max(0, b + adj));
        }

        // Blacks (crush the darkest tones)
        if (lum < 0.25) {
          const factor = (0.25 - lum) * 4;
          const adj = blackAdj * factor * 30;
          r = Math.min(255, Math.max(0, r - adj));
          g = Math.min(255, Math.max(0, g - adj));
          b = Math.min(255, Math.max(0, b - adj));
        }

        // Vibrance (boost under-saturated colors more)
        if (vibranceMul !== 0) {
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const currentSat = max === 0 ? 0 : (max - min) / max;
          const boost = vibranceMul * (1 - currentSat);
          const avg = (r + g + b) / 3;
          r = Math.min(255, Math.max(0, r + (r - avg) * boost));
          g = Math.min(255, Math.max(0, g + (g - avg) * boost));
          b = Math.min(255, Math.max(0, b + (b - avg) * boost));
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imgData, 0, 0);
    }
  }

  serialize(): SerializedEffect {
    return {
      id: this.id,
      instanceId: this.instanceId,
      enabled: this.enabled,
      parameters: { ...this.parameters },
    };
  }

  deserialize(data: SerializedEffect): void {
    this.instanceId = data.instanceId;
    this.enabled = data.enabled;
    this.parameters = { ...this.parameters, ...data.parameters };
  }

  destroy(): void {}
}

pluginRegistry.register("tonekit", "ToneKit", "color", ToneKit);
