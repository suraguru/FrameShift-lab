import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class Scanline implements EffectPlugin {
  readonly id = "scanline";
  readonly name = "Scanline";
  readonly category: EffectCategory = "retro";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    preset: "full",
    analogIntensity: 0.5,
    analogChroma: 0.5,
    analogTracking: 0.5,
    digitalSpeed: 0.5,
    digitalCoverage: 0.5,
    crtCurvature: 0.0,
    scanlineThickness: 1,
    scanlineSpacing: 4,
    verticalScanlines: false,
    animatedSweep: false,
    signalDegradation: 0,
    enableAnalog: true,
    enableDigital: true,
    enableCrt: true,
    mode: "Analog",
  };

  presets: Record<string, Record<string, any>> = {
    "Analog": { analogIntensity: 0.8, analogChroma: 0.5, digitalSpeed: 0, digitalCoverage: 0, crtCurvature: 0.3, enableAnalog: true, enableDigital: false, enableCrt: true },
    "Digital": { analogIntensity: 0, analogChroma: 0, digitalSpeed: 0.8, digitalCoverage: 0.7, crtCurvature: 0, enableAnalog: false, enableDigital: true, enableCrt: false },
    "CRT": { analogIntensity: 0.5, analogChroma: 0.8, digitalSpeed: 0.1, digitalCoverage: 0.1, crtCurvature: 0.8, scanlineThickness: 2, scanlineSpacing: 3, enableAnalog: true, enableDigital: true, enableCrt: true },
    "LCD Failure": { analogIntensity: 0.2, analogChroma: 0.1, digitalSpeed: 0.9, digitalCoverage: 0.9, crtCurvature: 0, scanlineThickness: 1, scanlineSpacing: 8, verticalScanlines: true, enableAnalog: true, enableDigital: true, enableCrt: false },
    "Terminal": { analogIntensity: 1.0, analogChroma: 0, digitalSpeed: 0, digitalCoverage: 0, crtCurvature: 0.2, scanlineThickness: 1, scanlineSpacing: 2, enableAnalog: true, enableDigital: false, enableCrt: true },
    "Subtle": { analogIntensity: 0.3, analogChroma: 0.2, digitalSpeed: 0, digitalCoverage: 0, crtCurvature: 0.1, scanlineThickness: 1, scanlineSpacing: 4, enableAnalog: true, enableDigital: false, enableCrt: true },
  };

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "mode", name: "Preset Mode", type: "select", options: Object.keys(this.presets), defaultValue: "Analog", group: "Profile", basic: true },
      { id: "analogIntensity", name: "Intensity", type: "number", defaultValue: 0.5, min: 0, max: 1, step: 0.01, group: "Analog", basic: true },
      { id: "analogChroma", name: "Chroma", type: "number", defaultValue: 0.5, min: 0, max: 1, step: 0.01, group: "Analog" },
      { id: "analogTracking", name: "Tracking Speed", type: "number", defaultValue: 0.5, min: 0, max: 1, step: 0.01, group: "Analog" },
      { id: "digitalSpeed", name: "Block Speed", type: "number", defaultValue: 0.5, min: 0, max: 1, step: 0.01, group: "Digital" },
      { id: "digitalCoverage", name: "Block Coverage", type: "number", defaultValue: 0.5, min: 0, max: 1, step: 0.01, group: "Digital", basic: true },
      { id: "crtCurvature", name: "CRT Curvature", type: "number", defaultValue: 0.0, min: 0, max: 1, step: 0.01, group: "CRT", basic: true },
      { id: "scanlineThickness", name: "Thickness", type: "number", defaultValue: 1, min: 1, max: 4, step: 1, group: "Lines", basic: true },
      { id: "scanlineSpacing", name: "Spacing", type: "number", defaultValue: 4, min: 2, max: 12, step: 1, group: "Lines" },
      { id: "verticalScanlines", name: "Vertical Lines", type: "boolean", defaultValue: false, group: "Lines" },
      { id: "animatedSweep", name: "Animated Sweep", type: "boolean", defaultValue: false, group: "Lines" },
      { id: "signalDegradation", name: "Signal Degradation", type: "number", defaultValue: 0, min: 0, max: 1, step: 0.01, group: "Signal" },
      { id: "enableAnalog", name: "Enable Analog", type: "boolean", defaultValue: true, group: "Analog" },
      { id: "enableDigital", name: "Enable Digital", type: "boolean", defaultValue: true, group: "Digital" },
      { id: "enableCrt", name: "Enable CRT", type: "boolean", defaultValue: true, group: "CRT" },
    ];
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const w = output.width, h = output.height;
    const mode = this.parameters.mode as string;
    const intensity = this.parameters.analogIntensity as number;
    const chroma = this.parameters.analogChroma as number;
    const tracking = this.parameters.analogTracking as number;
    const digitalSpeed = this.parameters.digitalSpeed as number;
    const digitalCoverage = this.parameters.digitalCoverage as number;
    const curvature = this.parameters.crtCurvature as number;
    const thickness = this.parameters.scanlineThickness as number;
    const spacing = this.parameters.scanlineSpacing as number;
    const vertical = this.parameters.verticalScanlines as boolean;
    const sweep = this.parameters.animatedSweep as boolean;
    const degradation = this.parameters.signalDegradation as number;
    const enableAnalog = this.parameters.enableAnalog as boolean ?? true;
    const enableDigital = this.parameters.enableDigital as boolean ?? true;
    const enableCrt = this.parameters.enableCrt as boolean ?? true;

    // Apply preset multipliers
    let analogMul = 1, digitalMul = 1, crtMul = 1;
    switch (mode) {
      case "Analog":  analogMul = 1.5; digitalMul = 0.2; crtMul = 0.5; break;
      case "Digital": analogMul = 0.3; digitalMul = 1.5; crtMul = 0.2; break;
      case "Subtle":  analogMul = 0.3; digitalMul = 0.2; crtMul = 0.3; break;
      default:        analogMul = 1.0; digitalMul = 1.0; crtMul = 1.0; break;
    }

    // ── CRT Barrel Distortion ──
    if (enableCrt && curvature * crtMul > 0.01) {
      const dist = curvature * crtMul * 0.4;
      const tempCanvas = new OffscreenCanvas(w, h);
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
      tempCtx.drawImage(input, 0, 0);
      const srcData = tempCtx.getImageData(0, 0, w, h);
      const outData = outCtx.createImageData(w, h);

      const cx = w / 2, cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (x - cx) / maxR;
          const dy = (y - cy) / maxR;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r === 0) {
            const dstI = (y * w + x) * 4;
            const srcI = (y * w + x) * 4;
            outData.data[dstI] = srcData.data[srcI];
            outData.data[dstI + 1] = srcData.data[srcI + 1];
            outData.data[dstI + 2] = srcData.data[srcI + 2];
            outData.data[dstI + 3] = srcData.data[srcI + 3];
            continue;
          }
          const rDistorted = r * (1 + dist * r * r);
          const srcX = Math.round(cx + (dx / r) * rDistorted * maxR);
          const srcY = Math.round(cy + (dy / r) * rDistorted * maxR);

          const dstI = (y * w + x) * 4;
          if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
            const srcI = (srcY * w + srcX) * 4;
            outData.data[dstI] = srcData.data[srcI];
            outData.data[dstI + 1] = srcData.data[srcI + 1];
            outData.data[dstI + 2] = srcData.data[srcI + 2];
            outData.data[dstI + 3] = 255;
          }
        }
      }
      outCtx.putImageData(outData, 0, 0);
    } else {
      outCtx.drawImage(input, 0, 0);
    }

    // ── Signal Degradation (horizontal line noise) ──
    if (degradation > 0) {
      const imgData = outCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let y = 0; y < h; y++) {
        if (Math.random() < degradation * 0.3) {
          const shift = Math.round((Math.random() - 0.5) * degradation * 20);
          if (shift !== 0) {
            const row = new Uint8ClampedArray(w * 4);
            for (let x = 0; x < w; x++) {
              const srcX = Math.min(w - 1, Math.max(0, x + shift));
              const di = x * 4;
              const si = srcX * 4;
              const ri = y * w * 4;
              row[di] = data[ri + si];
              row[di + 1] = data[ri + si + 1];
              row[di + 2] = data[ri + si + 2];
              row[di + 3] = data[ri + si + 3];
            }
            data.set(row, y * w * 4);
          }
        }
      }
      outCtx.putImageData(imgData, 0, 0);
    }

    // ── Analog Scanlines ──
    const analogAlpha = enableAnalog ? intensity * analogMul * 0.6 : 0;
    if (analogAlpha > 0.01) {
      outCtx.fillStyle = `rgba(0,0,0,${Math.min(analogAlpha, 0.9)})`;

      // Animated tracking sweep
      const sweepOffset = sweep ? Math.floor(ctx.time * tracking * 200) % spacing : 0;

      if (vertical) {
        for (let x = sweepOffset; x < w; x += spacing) {
          outCtx.fillRect(x, 0, thickness, h);
        }
      } else {
        for (let y = sweepOffset; y < h; y += spacing) {
          outCtx.fillRect(0, y, w, thickness);
        }
      }

      // Tracking line (animated horizontal bar)
      if (tracking > 0.1 && analogMul > 0.3) {
        const trackY = ((ctx.time * tracking * 150) % (h + 40)) - 20;
        outCtx.fillStyle = `rgba(255,255,255,${tracking * 0.08 * analogMul})`;
        outCtx.fillRect(0, trackY, w, 2 + tracking * 8);
      }
    }

    // ── RGB Subpixel Mask (Chroma) ──
    if (enableAnalog && chroma * analogMul > 0.1) {
      const chromaAlpha = chroma * analogMul * 0.15;
      outCtx.fillStyle = `rgba(255,0,0,${chromaAlpha})`;
      for (let x = 0; x < w; x += 3) outCtx.fillRect(x, 0, 1, h);
      outCtx.fillStyle = `rgba(0,255,0,${chromaAlpha})`;
      for (let x = 1; x < w; x += 3) outCtx.fillRect(x, 0, 1, h);
      outCtx.fillStyle = `rgba(0,0,255,${chromaAlpha})`;
      for (let x = 2; x < w; x += 3) outCtx.fillRect(x, 0, 1, h);
    }

    // ── Digital Block Artifacts ──
    if (enableDigital && digitalCoverage * digitalMul > 0.05) {
      const blockCount = Math.floor(digitalCoverage * digitalMul * 30);
      const speed = digitalSpeed * digitalMul;
      const time = ctx.time * speed * 10;

      for (let i = 0; i < blockCount; i++) {
        // Deterministic pseudo-random per block based on time + index
        const seed = Math.sin(i * 127.1 + time) * 43758.5453;
        const rand1 = seed - Math.floor(seed);
        const seed2 = Math.sin(i * 269.5 + time * 1.3) * 43758.5453;
        const rand2 = seed2 - Math.floor(seed2);

        if (rand1 < 0.5) continue; // Skip some blocks for intermittent feel

        const bx = Math.floor(rand1 * w);
        const by = Math.floor(rand2 * h);
        const bw = 20 + Math.floor(rand1 * w * 0.3 * digitalCoverage);
        const bh = 2 + Math.floor(rand2 * 6);

        // Copy a horizontal strip with offset
        const offsetX = Math.round((rand1 - 0.5) * 40 * speed);
        outCtx.drawImage(output, bx, by, bw, bh, bx + offsetX, by, bw, bh);
      }
    }

    // ── CRT corner vignette (subtle darkening at edges when curvature is on) ──
    if (enableCrt && curvature * crtMul > 0.05) {
      const grad = outCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${curvature * crtMul * 0.6})`);
      outCtx.fillStyle = grad;
      outCtx.fillRect(0, 0, w, h);
    }
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

pluginRegistry.register("scanline", "Scanline", "retro", Scanline);
