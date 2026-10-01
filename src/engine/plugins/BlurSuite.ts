import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class BlurSuite implements EffectPlugin {
  readonly id = "blursuite";
  readonly name = "BlurSuite";
  readonly category: EffectCategory = "distortion";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    blurType: 0, // 0=gaussian, 1=motion, 2=zoom, 3=directional, 4=lens
    radius: 5,
    angle: 0,
    centerX: 50,
    centerY: 50,
    quality: 8,
  };

  private tempCanvas: OffscreenCanvas | null = null;
  private tempCtx: OffscreenCanvasRenderingContext2D | null = null;

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "blurType", name: "Blur Type", type: "number", defaultValue: 0, min: 0, max: 4, step: 1 },
      { id: "radius", name: "Radius", type: "number", defaultValue: 5, min: 0, max: 50, step: 0.5 },
      { id: "angle", name: "Angle", type: "number", defaultValue: 0, min: 0, max: 360, step: 1 },
      { id: "centerX", name: "Center X", type: "number", defaultValue: 50, min: 0, max: 100, step: 1 },
      { id: "centerY", name: "Center Y", type: "number", defaultValue: 50, min: 0, max: 100, step: 1 },
      { id: "quality", name: "Quality", type: "number", defaultValue: 8, min: 2, max: 32, step: 1 },
    ];
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    _ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const w = output.width, h = output.height;
    const blurType = this.parameters.blurType as number;
    const radius = this.parameters.radius as number;
    const angle = (this.parameters.angle as number) * Math.PI / 180;
    let quality = this.parameters.quality as number;
    let passes = 1;

    // Scale quality based on execution mode
    if (_ctx.mode === "viewport") {
      quality = Math.max(4, quality * 0.5); // Lower quality for real-time
      passes = 1;
    } else {
      switch (_ctx.quality) {
        case "draft": quality *= 0.5; passes = 1; break;
        case "standard": quality *= 1.0; passes = 2; break;
        case "high": quality *= 2.0; passes = 3; break;
        case "ultra": quality *= 4.0; passes = 4; break;
        case "preview": quality *= 0.25; passes = 1; break;
      }
    }
    quality = Math.floor(quality);

    if (radius <= 0) {
      outCtx.drawImage(input, 0, 0);
      return;
    }

    switch (blurType) {
      case 0: // Gaussian
        outCtx.filter = `blur(${radius}px)`;
        outCtx.drawImage(input, 0, 0);
        outCtx.filter = "none";
        break;

      case 1: // Motion Blur
        this.motionBlur(input, output, outCtx, w, h, radius, angle, quality);
        break;

      case 2: // Zoom Blur
        this.zoomBlur(input, output, outCtx, w, h, radius, quality);
        break;

      case 3: // Directional Blur
        this.directionalBlur(input, output, outCtx, w, h, radius, angle, quality);
        break;

      case 4: // Lens Blur (bokeh approximation)
        this.lensBlur(input, output, outCtx, w, h, radius, passes);
        break;
    }
  }

  private motionBlur(
    input: OffscreenCanvas | HTMLCanvasElement,
    _output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    w: number, h: number,
    radius: number, angle: number, steps: number
  ): void {
    outCtx.clearRect(0, 0, w, h);
    const dx = Math.cos(angle) * radius / steps;
    const dy = Math.sin(angle) * radius / steps;

    outCtx.globalAlpha = 1 / steps;
    for (let i = 0; i < steps; i++) {
      const offsetX = dx * (i - steps / 2);
      const offsetY = dy * (i - steps / 2);
      outCtx.drawImage(input, offsetX, offsetY);
    }
    outCtx.globalAlpha = 1;
  }

  private zoomBlur(
    input: OffscreenCanvas | HTMLCanvasElement,
    _output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    w: number, h: number,
    radius: number, steps: number
  ): void {
    const cx = (this.parameters.centerX as number) / 100 * w;
    const cy = (this.parameters.centerY as number) / 100 * h;

    outCtx.clearRect(0, 0, w, h);
    outCtx.globalAlpha = 1 / steps;

    for (let i = 0; i < steps; i++) {
      const scale = 1 + (radius / 500) * (i / steps);
      outCtx.save();
      outCtx.translate(cx, cy);
      outCtx.scale(scale, scale);
      outCtx.translate(-cx, -cy);
      outCtx.drawImage(input, 0, 0);
      outCtx.restore();
    }
    outCtx.globalAlpha = 1;
  }

  private directionalBlur(
    input: OffscreenCanvas | HTMLCanvasElement,
    _output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    w: number, h: number,
    radius: number, angle: number, steps: number
  ): void {
    outCtx.clearRect(0, 0, w, h);
    const dx = Math.cos(angle) * radius / steps;
    const dy = Math.sin(angle) * radius / steps;

    outCtx.globalAlpha = 1 / steps;
    for (let i = 0; i < steps; i++) {
      outCtx.drawImage(input, dx * i, dy * i);
    }
    outCtx.globalAlpha = 1;
  }

  private lensBlur(
    input: OffscreenCanvas | HTMLCanvasElement,
    _output: OffscreenCanvas | HTMLCanvasElement,
    outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    w: number, h: number,
    radius: number,
    passes: number
  ): void {
    // Multi-pass hexagonal bokeh approximation
    outCtx.drawImage(input, 0, 0);

    const actualPasses = Math.max(1, passes * 3);
    const passRadius = radius / actualPasses;

    for (let p = 0; p < actualPasses; p++) {
      const angle = (p * 60) * Math.PI / 180;
      const dx = Math.cos(angle) * passRadius;
      const dy = Math.sin(angle) * passRadius;

      if (!this.tempCanvas) {
        this.tempCanvas = new OffscreenCanvas(w, h);
        this.tempCtx = this.tempCanvas.getContext("2d")!;
      } else if (this.tempCanvas.width !== w || this.tempCanvas.height !== h) {
        this.tempCanvas.width = w;
        this.tempCanvas.height = h;
      }
      
      this.tempCtx!.drawImage(_output, 0, 0);

      outCtx.clearRect(0, 0, w, h);
      outCtx.globalAlpha = 0.5;
      outCtx.drawImage(this.tempCanvas, dx, dy);
      outCtx.drawImage(this.tempCanvas, -dx, -dy);
      outCtx.globalAlpha = 1;
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
    this.tempCanvas = null;
    this.tempCtx = null;
  }
}

pluginRegistry.register("blursuite", "BlurSuite", "distortion", BlurSuite);
