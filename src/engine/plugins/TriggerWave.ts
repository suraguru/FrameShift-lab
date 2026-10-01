import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class TriggerWave implements EffectPlugin {
  readonly id = "triggerwave";
  readonly name = "TriggerWave";
  readonly category: EffectCategory = "distortion";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    mode: 0, // 0=ripple, 1=shockwave, 2=pulse, 3=wave
    amplitude: 15,
    frequency: 10,
    speed: 3,
    decay: 50,
    centerX: 50,
    centerY: 50,
    useMousePosition: false,
  };

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "mode", name: "Wave Mode", type: "number", defaultValue: 0, min: 0, max: 3, step: 1 },
      { id: "amplitude", name: "Amplitude", type: "number", defaultValue: 15, min: 0, max: 100, step: 1 },
      { id: "frequency", name: "Frequency", type: "number", defaultValue: 10, min: 1, max: 50, step: 1 },
      { id: "speed", name: "Speed", type: "number", defaultValue: 3, min: 0, max: 20, step: 0.5 },
      { id: "decay", name: "Decay", type: "number", defaultValue: 50, min: 0, max: 100, step: 1 },
      { id: "centerX", name: "Center X", type: "number", defaultValue: 50, min: 0, max: 100, step: 1 },
      { id: "centerY", name: "Center Y", type: "number", defaultValue: 50, min: 0, max: 100, step: 1 },
      { id: "useMousePosition", name: "Follow Mouse", type: "boolean", defaultValue: false },
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
      case 0: this.ripple(input, output, outCtx, ctx); break;
      case 1: this.shockwave(input, output, outCtx, ctx); break;
      case 2: this.pulse(input, output, outCtx, ctx); break;
      case 3: this.wave(input, output, outCtx, ctx); break;
      default: outCtx.drawImage(input, 0, 0);
    }
  }

  private getCenter(ctx: RenderContext, w: number, h: number): [number, number] {
    if (this.parameters.useMousePosition) {
      return [ctx.mouseX, ctx.mouseY];
    }
    return [
      (this.parameters.centerX as number) / 100 * w,
      (this.parameters.centerY as number) / 100 * h,
    ];
  }

  private ripple(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ctx: RenderContext
  ): void {
    const w = output.width, h = output.height;
    const amp = this.parameters.amplitude as number;
    const freq = this.parameters.frequency as number;
    const speed = this.parameters.speed as number;
    const decay = (this.parameters.decay as number) / 100;
    const [cx, cy] = this.getCenter(ctx, w, h);

    const tempCanvas = new OffscreenCanvas(w, h);
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    tempCtx.drawImage(input, 0, 0);
    const srcData = tempCtx.getImageData(0, 0, w, h);
    const outData = outCtx.createImageData(w, h);

    const t = ctx.time * speed;
    const maxDist = Math.sqrt(w * w + h * h) / 2;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normalDist = dist / maxDist;
        const decayFactor = Math.exp(-normalDist * decay * 3);
        const displacement = Math.sin(dist / freq - t * 5) * amp * decayFactor;

        const angle = Math.atan2(dy, dx);
        const srcX = Math.min(w - 1, Math.max(0, Math.round(x + Math.cos(angle) * displacement)));
        const srcY = Math.min(h - 1, Math.max(0, Math.round(y + Math.sin(angle) * displacement)));

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

  private shockwave(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ctx: RenderContext
  ): void {
    const w = output.width, h = output.height;
    const amp = this.parameters.amplitude as number;
    const speed = this.parameters.speed as number;
    const [cx, cy] = this.getCenter(ctx, w, h);

    outCtx.drawImage(input, 0, 0);

    const maxRadius = Math.sqrt(w * w + h * h) / 2;
    const waveRadius = ((ctx.time * speed * 50) % maxRadius);
    const thickness = amp * 2;

    const imgData = outCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const srcData = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const waveDist = Math.abs(dist - waveRadius);

        if (waveDist < thickness) {
          const factor = 1 - waveDist / thickness;
          const displacement = factor * amp;
          const angle = Math.atan2(dy, dx);
          const srcX = Math.min(w - 1, Math.max(0, Math.round(x + Math.cos(angle) * displacement)));
          const srcY = Math.min(h - 1, Math.max(0, Math.round(y + Math.sin(angle) * displacement)));

          const dstI = (y * w + x) * 4;
          const srcI = (srcY * w + srcX) * 4;
          data[dstI] = srcData[srcI];
          data[dstI + 1] = srcData[srcI + 1];
          data[dstI + 2] = srcData[srcI + 2];
        }
      }
    }
    outCtx.putImageData(imgData, 0, 0);
  }

  private pulse(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ctx: RenderContext
  ): void {
    const w = output.width, h = output.height;
    const amp = this.parameters.amplitude as number;
    const speed = this.parameters.speed as number;
    const [cx, cy] = this.getCenter(ctx, w, h);

    const scale = 1 + Math.sin(ctx.time * speed * 2) * amp / 500;

    outCtx.clearRect(0, 0, w, h);
    outCtx.save();
    outCtx.translate(cx, cy);
    outCtx.scale(scale, scale);
    outCtx.translate(-cx, -cy);
    outCtx.drawImage(input, 0, 0);
    outCtx.restore();
  }

  private wave(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ctx: RenderContext
  ): void {
    const w = output.width, h = output.height;
    const amp = this.parameters.amplitude as number;
    const freq = this.parameters.frequency as number;
    const speed = this.parameters.speed as number;

    outCtx.clearRect(0, 0, w, h);
    const t = ctx.time * speed;

    for (let y = 0; y < h; y += 1) {
      const offset = Math.sin(y / freq + t) * amp;
      outCtx.drawImage(input, 0, y, w, 1, offset, y, w, 1);
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

pluginRegistry.register("triggerwave", "TriggerWave", "distortion", TriggerWave);
