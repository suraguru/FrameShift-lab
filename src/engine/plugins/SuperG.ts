import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class SuperG implements EffectPlugin {
  readonly id = "superg";
  readonly name = "Super-G";
  readonly category: EffectCategory = "ai";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    sharpenAmount: 0.5,
    sharpenRadius: 1,
    detailRecovery: 0.3,
    glowAmount: 0.2,
    glowRadius: 10,
  };

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "sharpenAmount", name: "Sharpen Amount", type: "number", defaultValue: 0.5, min: 0, max: 2, step: 0.05, group: "Enhance" },
      { id: "sharpenRadius", name: "Sharpen Radius", type: "number", defaultValue: 1, min: 0.5, max: 5, step: 0.1, group: "Enhance" },
      { id: "detailRecovery", name: "Local Contrast", type: "number", defaultValue: 0.3, min: 0, max: 1, step: 0.05, group: "Enhance" },
      { id: "glowAmount", name: "Glow Amount", type: "number", defaultValue: 0.2, min: 0, max: 1, step: 0.05, group: "Bloom" },
      { id: "glowRadius", name: "Glow Radius", type: "number", defaultValue: 10, min: 2, max: 50, step: 1, group: "Bloom" },
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
    const sharpenAmount = this.parameters.sharpenAmount as number;
    const sharpenRadius = this.parameters.sharpenRadius as number;
    const detailRecovery = this.parameters.detailRecovery as number;
    const glowAmount = this.parameters.glowAmount as number;
    const glowRadius = this.parameters.glowRadius as number;

    // Draw base
    outCtx.drawImage(input, 0, 0);

    // 1. Unsharp Mask (Sharpening & Detail Recovery)
    if (sharpenAmount > 0 || detailRecovery > 0) {
      // Create blurred version
      const blurCanvas = new OffscreenCanvas(w, h);
      const blurCtx = blurCanvas.getContext("2d")!;
      blurCtx.filter = `blur(${sharpenRadius}px)`;
      blurCtx.drawImage(input, 0, 0);

      const srcData = outCtx.getImageData(0, 0, w, h);
      const blurData = blurCtx.getImageData(0, 0, w, h);
      const data = srcData.data;
      const bData = blurData.data;

      // Sharpening is: original + (original - blurred) * amount
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          const orig = data[i + c];
          const blurred = bData[i + c];
          const diff = orig - blurred;
          
          let newVal = orig + diff * sharpenAmount;
          // Local contrast adjustment
          if (detailRecovery > 0) {
             newVal += (orig - 128) * detailRecovery * (1 - blurred/255);
          }
          data[i + c] = Math.min(255, Math.max(0, newVal));
        }
      }
      outCtx.putImageData(srcData, 0, 0);
    }

    // 2. Glow / Bloom
    if (glowAmount > 0) {
      const glowCanvas = new OffscreenCanvas(w, h);
      const glowCtx = glowCanvas.getContext("2d")!;
      glowCtx.filter = `blur(${glowRadius}px)`;
      glowCtx.drawImage(output, 0, 0);
      
      outCtx.globalCompositeOperation = "screen";
      outCtx.globalAlpha = glowAmount;
      outCtx.drawImage(glowCanvas, 0, 0);
      
      // Reset
      outCtx.globalCompositeOperation = "source-over";
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
  destroy(): void {}
}

pluginRegistry.register("superg", "Super-G", "ai", SuperG);
