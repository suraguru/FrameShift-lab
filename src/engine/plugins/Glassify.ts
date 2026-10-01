import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class Glassify implements EffectPlugin {
  readonly id = "glassify";
  readonly name = "Glassify";
  readonly category: EffectCategory = "distortion";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    mode: 0, // 0=refraction, 1=frosted, 2=barrel, 3=liquid
    intensity: 20,
    scale: 10,
    frostedBlur: 3,
    barrelDistortion: 30,
    liquidSpeed: 2,
    liquidComplexity: 5,
  };

  private noiseTexture: Float32Array | null = null;
  private noiseWidth = 0;
  private noiseHeight = 0;

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "mode", name: "Glass Mode", type: "number", defaultValue: 0, min: 0, max: 3, step: 1 },
      { id: "intensity", name: "Intensity", type: "number", defaultValue: 20, min: 0, max: 100, step: 1 },
      { id: "scale", name: "Scale", type: "number", defaultValue: 10, min: 1, max: 100, step: 1 },
      { id: "frostedBlur", name: "Frost Blur", type: "number", defaultValue: 3, min: 0, max: 20, step: 1 },
      { id: "barrelDistortion", name: "Barrel/Pincushion", type: "number", defaultValue: 30, min: -100, max: 100, step: 1 },
      { id: "liquidSpeed", name: "Liquid Speed", type: "number", defaultValue: 2, min: 0, max: 10, step: 0.5 },
      { id: "liquidComplexity", name: "Liquid Detail", type: "number", defaultValue: 5, min: 1, max: 20, step: 1 },
    ];
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const mode = this.parameters.mode as number;

    switch (mode) {
      case 0: this.refraction(input, output, outCtx, ctx); break;
      case 1: this.frostedGlass(input, output, outCtx); break;
      case 2: this.barrelDistortion(input, output, outCtx); break;
      case 3: this.liquidGlass(input, output, outCtx, ctx); break;
      default: outCtx.drawImage(input, 0, 0);
    }
  }

  private refraction(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ctx: RenderContext
  ): void {
    const w = output.width, h = output.height;
    const intensity = this.parameters.intensity as number;
    const scale = this.parameters.scale as number;

    // Read input pixels
    const tempCanvas = new OffscreenCanvas(w, h);
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    tempCtx.drawImage(input, 0, 0);
    const srcData = tempCtx.getImageData(0, 0, w, h);
    const outData = outCtx.createImageData(w, h);

    const factor = intensity / 100;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Displacement using sine waves for refraction pattern
        const dx = Math.sin(y / scale + ctx.time) * factor * scale;
        const dy = Math.cos(x / scale + ctx.time) * factor * scale;

        const srcX = Math.min(w - 1, Math.max(0, Math.round(x + dx)));
        const srcY = Math.min(h - 1, Math.max(0, Math.round(y + dy)));

        const dstI = (y * w + x) * 4;
        const srcI = (srcY * w + srcX) * 4;

        outData.data[dstI] = srcData.data[srcI];
        outData.data[dstI + 1] = srcData.data[srcI + 1];
        outData.data[dstI + 2] = srcData.data[srcI + 2];
        outData.data[dstI + 3] = srcData.data[srcI + 3];
      }
    }

    outCtx.putImageData(outData, 0, 0);
  }

  private frostedGlass(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    const w = output.width, h = output.height;
    const intensity = this.parameters.intensity as number;
    const frostedBlur = this.parameters.frostedBlur as number;

    // Random displacement + blur
    const tempCanvas = new OffscreenCanvas(w, h);
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    tempCtx.drawImage(input, 0, 0);
    const srcData = tempCtx.getImageData(0, 0, w, h);
    const outData = outCtx.createImageData(w, h);

    const radius = Math.floor(intensity / 10);
    
    // Generate noise texture if needed
    if (!this.noiseTexture || this.noiseWidth !== w || this.noiseHeight !== h) {
      this.noiseWidth = w;
      this.noiseHeight = h;
      this.noiseTexture = new Float32Array(w * h * 2);
      for (let i = 0; i < w * h * 2; i++) {
        this.noiseTexture[i] = Math.random() - 0.5;
      }
    }

    const noise = this.noiseTexture;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const noiseIdx = (y * w + x) * 2;
        const randX = Math.min(w - 1, Math.max(0, x + Math.floor(noise[noiseIdx] * radius * 2)));
        const randY = Math.min(h - 1, Math.max(0, y + Math.floor(noise[noiseIdx + 1] * radius * 2)));

        const dstI = (y * w + x) * 4;
        const srcI = (randY * w + randX) * 4;

        outData.data[dstI] = srcData.data[srcI];
        outData.data[dstI + 1] = srcData.data[srcI + 1];
        outData.data[dstI + 2] = srcData.data[srcI + 2];
        outData.data[dstI + 3] = srcData.data[srcI + 3];
      }
    }

    outCtx.putImageData(outData, 0, 0);

    if (frostedBlur > 0) {
      const blurCanvas = new OffscreenCanvas(w, h);
      const blurCtx = blurCanvas.getContext("2d")!;
      blurCtx.filter = `blur(${frostedBlur}px)`;
      blurCtx.drawImage(output, 0, 0);
      outCtx.drawImage(blurCanvas, 0, 0);
    }
  }

  private barrelDistortion(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    const w = output.width, h = output.height;
    const distortion = (this.parameters.barrelDistortion as number) / 100;

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
        const rDistorted = r * (1 + distortion * r * r);
        const srcX = Math.round(cx + dx / r * rDistorted * maxR) || Math.round(cx);
        const srcY = Math.round(cy + dy / r * rDistorted * maxR) || Math.round(cy);

        const dstI = (y * w + x) * 4;
        if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
          const srcI = (srcY * w + srcX) * 4;
          outData.data[dstI] = srcData.data[srcI];
          outData.data[dstI + 1] = srcData.data[srcI + 1];
          outData.data[dstI + 2] = srcData.data[srcI + 2];
          outData.data[dstI + 3] = srcData.data[srcI + 3];
        }
      }
    }

    outCtx.putImageData(outData, 0, 0);
  }

  private liquidGlass(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ctx: RenderContext
  ): void {
    const w = output.width, h = output.height;
    const intensity = this.parameters.intensity as number;
    const speed = this.parameters.liquidSpeed as number;
    const complexity = this.parameters.liquidComplexity as number;

    const tempCanvas = new OffscreenCanvas(w, h);
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    tempCtx.drawImage(input, 0, 0);
    const srcData = tempCtx.getImageData(0, 0, w, h);
    const outData = outCtx.createImageData(w, h);

    const t = ctx.time * speed;
    const factor = intensity / 50;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = Math.sin(x / complexity + t) * Math.cos(y / (complexity * 1.3) + t * 0.7) * factor * complexity;
        const dy = Math.cos(x / (complexity * 0.9) + t * 1.1) * Math.sin(y / complexity + t * 0.8) * factor * complexity;

        const srcX = Math.min(w - 1, Math.max(0, Math.round(x + dx)));
        const srcY = Math.min(h - 1, Math.max(0, Math.round(y + dy)));

        const dstI = (y * w + x) * 4;
        const srcI = (srcY * w + srcX) * 4;

        outData.data[dstI] = srcData.data[srcI];
        outData.data[dstI + 1] = srcData.data[srcI + 1];
        outData.data[dstI + 2] = srcData.data[srcI + 2];
        outData.data[dstI + 3] = srcData.data[srcI + 3];
      }
    }

    outCtx.putImageData(outData, 0, 0);
  }

  serialize(): SerializedEffect {
    return { id: this.id, instanceId: this.instanceId, enabled: this.enabled, parameters: { ...this.parameters } };
  }
  deserialize(data: SerializedEffect): void {
    this.instanceId = data.instanceId; this.enabled = data.enabled;
    this.parameters = { ...this.parameters, ...data.parameters };
  }
  destroy(): void {
    this.noiseTexture = null;
  }
}

pluginRegistry.register("glassify", "Glassify", "distortion", Glassify);
