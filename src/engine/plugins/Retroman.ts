import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class Retroman implements EffectPlugin {
  readonly id = "retroman";
  readonly name = "Retroman";
  readonly category: EffectCategory = "retro";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    aberration: 4,
    noiseIntensity: 15,
    scanlineOpacity: 30,
    vhsTracking: 0,
    ghosting: 0,
    colorBleed: 0,
    pixelate: 1,
    crtCurvature: 0,
    staticNoise: 10,
    tapeDamage: 0,
    signalDrift: 0,
    vignette: 20,
    mode: "Custom",
  };

  presets: Record<string, Record<string, any>> = {
    "VHS Heavy": { aberration: 8, noiseIntensity: 25, scanlineOpacity: 50, vhsTracking: 30, ghosting: 15, colorBleed: 10, tapeDamage: 25, signalDrift: 15 },
    "VHS Light": { aberration: 2, noiseIntensity: 10, scanlineOpacity: 20, vhsTracking: 5, ghosting: 2, colorBleed: 3, tapeDamage: 0, signalDrift: 2 },
    "Arcade": { aberration: 0, noiseIntensity: 5, scanlineOpacity: 70, crtCurvature: 15, pixelate: 2, vignette: 30, colorBleed: 5 },
    "Security Camera": { noiseIntensity: 30, staticNoise: 20, scanlineOpacity: 10, aberration: 0, ghosting: 10, tapeDamage: 5, crtCurvature: 10, colorBleed: 0 },
    "Broken CRT": { aberration: 20, noiseIntensity: 15, scanlineOpacity: 40, vhsTracking: 40, signalDrift: 30, crtCurvature: 25, tapeDamage: 10 },
    "Broadcast TV": { aberration: 4, noiseIntensity: 10, scanlineOpacity: 30, vhsTracking: 2, ghosting: 5, colorBleed: 8, crtCurvature: 10, signalDrift: 5 },
    "Custom": {},
  };

  private noiseCanvas: OffscreenCanvas | null = null;
  private noiseCtx: OffscreenCanvasRenderingContext2D | null = null;

  async initialize(): Promise<void> {
    this.noiseCanvas = new OffscreenCanvas(256, 256);
    this.noiseCtx = this.noiseCanvas.getContext("2d")!;
  }

  getParameters(): EffectParameter[] {
    return [
      { id: "mode", name: "Preset Mode", type: "select", options: Object.keys(this.presets), defaultValue: "Custom", group: "Profile", basic: true },
      { id: "aberration", name: "Chromatic Aberration", type: "number", defaultValue: 4, min: 0, max: 30, step: 1, group: "Distortion", basic: true },
      { id: "noiseIntensity", name: "Film Grain", type: "number", defaultValue: 15, min: 0, max: 100, step: 1, group: "Noise" },
      { id: "staticNoise", name: "Static Noise", type: "number", defaultValue: 10, min: 0, max: 100, step: 1, group: "Noise" },
      { id: "scanlineOpacity", name: "Scanlines", type: "number", defaultValue: 30, min: 0, max: 100, step: 1, group: "CRT", basic: true },
      { id: "crtCurvature", name: "CRT Curvature", type: "number", defaultValue: 0, min: 0, max: 50, step: 1, group: "CRT", basic: true },
      { id: "vhsTracking", name: "VHS Tracking", type: "number", defaultValue: 0, min: 0, max: 50, step: 1, group: "VHS", basic: true },
      { id: "ghosting", name: "Ghosting", type: "number", defaultValue: 0, min: 0, max: 50, step: 1, group: "VHS" },
      { id: "colorBleed", name: "Color Bleed", type: "number", defaultValue: 0, min: 0, max: 20, step: 1, group: "VHS" },
      { id: "tapeDamage", name: "Tape Damage", type: "number", defaultValue: 0, min: 0, max: 30, step: 1, group: "VHS" },
      { id: "signalDrift", name: "Signal Drift", type: "number", defaultValue: 0, min: 0, max: 30, step: 1, group: "VHS" },
      { id: "pixelate", name: "Pixel Size", type: "number", defaultValue: 1, min: 1, max: 20, step: 1, group: "CRT" },
      { id: "vignette", name: "Vignette", type: "number", defaultValue: 20, min: 0, max: 100, step: 1, group: "CRT" },
    ];
  }

  private generateNoise(w: number, h: number, intensity: number): void {
    if (!this.noiseCtx || !this.noiseCanvas) return;
    this.noiseCanvas.width = w;
    this.noiseCanvas.height = h;
    const imgData = this.noiseCtx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() - 0.5) * intensity * 2.55;
      data[i] = 128 + v;
      data[i + 1] = 128 + v;
      data[i + 2] = 128 + v;
      data[i + 3] = 255;
    }
    this.noiseCtx.putImageData(imgData, 0, 0);
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const w = output.width, h = output.height;
    const aberration = this.parameters.aberration as number;
    const noiseIntensity = this.parameters.noiseIntensity as number;
    const scanlineOpacity = this.parameters.scanlineOpacity as number;
    const vhsTracking = this.parameters.vhsTracking as number;
    const ghosting = this.parameters.ghosting as number;
    const colorBleed = this.parameters.colorBleed as number;
    const pixelate = this.parameters.pixelate as number;
    const crtCurvature = this.parameters.crtCurvature as number;
    const staticNoise = this.parameters.staticNoise as number;
    const tapeDamage = this.parameters.tapeDamage as number;
    const signalDrift = this.parameters.signalDrift as number;
    const vignette = this.parameters.vignette as number;

    // ── CRT Barrel Distortion ──
    if (crtCurvature > 0) {
      const dist = crtCurvature / 100;
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
          const dstI = (y * w + x) * 4;

          if (r === 0) {
            const srcI = (y * w + x) * 4;
            outData.data[dstI] = srcData.data[srcI];
            outData.data[dstI + 1] = srcData.data[srcI + 1];
            outData.data[dstI + 2] = srcData.data[srcI + 2];
            outData.data[dstI + 3] = 255;
            continue;
          }

          const rDistorted = r * (1 + dist * r * r);
          const srcX = Math.round(cx + (dx / r) * rDistorted * maxR);
          const srcY = Math.round(cy + (dy / r) * rDistorted * maxR);

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

    // ── Signal Drift ──
    if (signalDrift > 0) {
      const driftAmount = Math.sin(ctx.time * 3.7) * signalDrift;
      const imgData = outCtx.getImageData(0, 0, w, h);
      const tempData = new Uint8ClampedArray(imgData.data);
      for (let y = 0; y < h; y++) {
        const lineOffset = Math.sin(y * 0.01 + ctx.time * 5) * driftAmount;
        const shift = Math.round(lineOffset);
        for (let x = 0; x < w; x++) {
          const srcX = Math.min(w - 1, Math.max(0, x + shift));
          const dstIdx = (y * w + x) * 4;
          const srcIdx = (y * w + srcX) * 4;
          imgData.data[dstIdx] = tempData[srcIdx];
          imgData.data[dstIdx + 1] = tempData[srcIdx + 1];
          imgData.data[dstIdx + 2] = tempData[srcIdx + 2];
        }
      }
      outCtx.putImageData(imgData, 0, 0);
    }

    // ── Chromatic Aberration ──
    if (aberration > 0) {
      const tempCanvas = new OffscreenCanvas(w, h);
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(output, 0, 0);

      outCtx.clearRect(0, 0, w, h);

      // Red channel shifted right
      outCtx.globalCompositeOperation = "screen";
      outCtx.fillStyle = `rgba(255,0,0,0.5)`;
      outCtx.fillRect(0, 0, w, h);
      outCtx.globalCompositeOperation = "multiply";
      outCtx.drawImage(tempCanvas, aberration, 0);

      // Green channel centered
      outCtx.globalCompositeOperation = "screen";
      outCtx.fillStyle = `rgba(0,255,0,0.5)`;
      outCtx.fillRect(0, 0, w, h);
      outCtx.globalCompositeOperation = "multiply";
      outCtx.drawImage(tempCanvas, 0, 0);

      // Blue channel shifted left
      outCtx.globalCompositeOperation = "screen";
      outCtx.fillStyle = `rgba(0,0,255,0.5)`;
      outCtx.fillRect(0, 0, w, h);
      outCtx.globalCompositeOperation = "multiply";
      outCtx.drawImage(tempCanvas, -aberration, 0);

      outCtx.globalCompositeOperation = "source-over";
    }

    // ── Ghosting ──
    if (ghosting > 0) {
      outCtx.globalAlpha = ghosting / 100;
      outCtx.drawImage(input, ghosting * 0.5, ghosting * 0.3);
      outCtx.globalAlpha = 1;
    }

    // ── Color Bleed ──
    if (colorBleed > 0) {
      outCtx.filter = `blur(${colorBleed}px)`;
      outCtx.globalCompositeOperation = "lighten";
      outCtx.globalAlpha = 0.15;
      outCtx.drawImage(output, colorBleed, 0);
      outCtx.globalAlpha = 1;
      outCtx.globalCompositeOperation = "source-over";
      outCtx.filter = "none";
    }

    // ── VHS Tracking Lines ──
    if (vhsTracking > 0) {
      const trackY = ((ctx.time * 100) % (h + vhsTracking * 4)) - vhsTracking * 2;
      outCtx.fillStyle = `rgba(255,255,255,${vhsTracking / 200})`;
      outCtx.fillRect(0, trackY, w, vhsTracking);
      outCtx.fillRect(0, trackY - h * 0.3, w, vhsTracking * 0.5);
    }

    // ── Tape Damage ──
    if (tapeDamage > 0 && Math.random() < tapeDamage / 100) {
      const damageY = Math.random() * h;
      const damageH = 2 + Math.random() * tapeDamage;
      outCtx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.3})`;
      outCtx.fillRect(0, damageY, w, damageH);
    }

    // ── Pixelation ──
    if (pixelate > 1) {
      const sw = Math.floor(w / pixelate);
      const sh = Math.floor(h / pixelate);
      const tempCanvas = new OffscreenCanvas(sw, sh);
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(output, 0, 0, sw, sh);
      outCtx.imageSmoothingEnabled = false;
      outCtx.clearRect(0, 0, w, h);
      outCtx.drawImage(tempCanvas, 0, 0, w, h);
      outCtx.imageSmoothingEnabled = true;
    }

    // ── Scanlines ──
    if (scanlineOpacity > 0) {
      outCtx.fillStyle = `rgba(0,0,0,${scanlineOpacity / 200})`;
      for (let y = 0; y < h; y += 3) {
        outCtx.fillRect(0, y, w, 1);
      }
    }

    // ── Static Noise ──
    if (staticNoise > 0) {
      this.generateNoise(Math.min(w, 512), Math.min(h, 512), staticNoise);
      if (this.noiseCanvas) {
        outCtx.globalCompositeOperation = "overlay";
        outCtx.globalAlpha = staticNoise / 200;
        outCtx.drawImage(this.noiseCanvas, 0, 0, w, h);
        outCtx.globalAlpha = 1;
        outCtx.globalCompositeOperation = "source-over";
      }
    }

    // ── Film Grain ──
    if (noiseIntensity > 0) {
      this.generateNoise(Math.min(w, 256), Math.min(h, 256), noiseIntensity);
      if (this.noiseCanvas) {
        outCtx.globalCompositeOperation = "overlay";
        outCtx.globalAlpha = noiseIntensity / 300;
        outCtx.drawImage(this.noiseCanvas, 0, 0, w, h);
        outCtx.globalAlpha = 1;
        outCtx.globalCompositeOperation = "source-over";
      }
    }

    // ── Vignette ──
    if (vignette > 0) {
      const cx = w / 2, cy = h / 2;
      const radius = Math.max(w, h) * 0.7;
      const gradient = outCtx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
      outCtx.fillStyle = gradient;
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
  destroy(): void {
    this.noiseCanvas = null;
    this.noiseCtx = null;
  }
}

pluginRegistry.register("retroman", "Retroman", "retro", Retroman);
