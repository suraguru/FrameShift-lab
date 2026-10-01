import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class ASCIIKit implements EffectPlugin {
  readonly id = "asciikit";
  readonly name = "ASCIIKit";
  readonly category: EffectCategory = "retro";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    sequence: "binary",
    fontFamily: "monospace",
    fontScale: 1.0,
    charSpacing: 1.0,
    lineHeight: 1.2,
    contrast: 1.0,
    monochrome: false,
    invert: false,
    edgeEnhanced: false,
    brightness: 1.0,
    gamma: 1.0,
    glowAmount: 0.0,
    glowRadius: 10,
  };

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "sequence", name: "Sequence", type: "select", defaultValue: "binary", options: ["standard", "blocks", "simple", "binary", "dense", "minimal", "retro", "symbols", "custom"], group: "Style" },
      { id: "fontFamily", name: "Font", type: "select", defaultValue: "monospace", options: ["monospace", "courier", "consolas", "lucida"], group: "Style" },
      { id: "fontScale", name: "Scale", type: "number", defaultValue: 1.0, min: 0.1, max: 3.0, step: 0.01, group: "Layout" },
      { id: "charSpacing", name: "Char Spacing", type: "number", defaultValue: 1.0, min: 0.5, max: 3.0, step: 0.1, group: "Layout" },
      { id: "lineHeight", name: "Line Height", type: "number", defaultValue: 1.2, min: 0.5, max: 3.0, step: 0.1, group: "Layout" },
      { id: "contrast", name: "Contrast", type: "number", defaultValue: 1.0, min: 0.0, max: 3.0, step: 0.1, group: "Color" },
      { id: "monochrome", name: "Monochrome", type: "boolean", defaultValue: false, group: "Color" },
      { id: "invert", name: "Invert", type: "boolean", defaultValue: false, group: "Color" },
      { id: "brightness", name: "Brightness", type: "number", defaultValue: 1.0, min: 0.0, max: 3.0, step: 0.1, group: "Color" },
      { id: "gamma", name: "Gamma", type: "number", defaultValue: 1.0, min: 0.1, max: 3.0, step: 0.1, group: "Color" },
      { id: "glowAmount", name: "Glow Amount", type: "number", defaultValue: 0.0, min: 0, max: 1, step: 0.05, group: "Style" },
      { id: "glowRadius", name: "Glow Radius", type: "number", defaultValue: 10, min: 2, max: 50, step: 1, group: "Style" },
      { id: "edgeEnhanced", name: "Edge Enhanced", type: "boolean", defaultValue: false, group: "Style" },
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
    const sequenceMap: Record<string, string> = {
      standard: " .:-=+*#%@",
      blocks: " ░▒▓█",
      simple: " .oO@#",
      binary: " 01",
      dense: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
      minimal: " -+",
      retro: " ▄▀█",
      symbols: " *&%$#@!",
      custom: " .:-=+*#%@",
    };

    const seqName = (this.parameters.sequence as string) || "binary";
    const chars = sequenceMap[seqName] || sequenceMap["standard"];
    const fontScale = (this.parameters.fontScale as number) || 1.0;
    const contrast = (this.parameters.contrast as number) || 1.0;
    const fontFamily = (this.parameters.fontFamily as string) || "monospace";
    const charSpacing = (this.parameters.charSpacing as number) || 1.0;
    const lineHeight = (this.parameters.lineHeight as number) || 1.2;
    const monochrome = (this.parameters.monochrome as boolean) || false;
    const invert = (this.parameters.invert as boolean) || false;
    const edgeEnhanced = (this.parameters.edgeEnhanced as boolean) || false;
    const globalBrightness = (this.parameters.brightness as number) ?? 1.0;
    const gamma = (this.parameters.gamma as number) ?? 1.0;
    const glowAmount = (this.parameters.glowAmount as number) ?? 0.0;
    const glowRadius = (this.parameters.glowRadius as number) ?? 10;

    const baseCharSize = 10;
    const charSize = Math.max(4, Math.floor(baseCharSize / fontScale));

    const sampW = Math.ceil(w / (charSize * charSpacing));
    const sampH = Math.ceil(h / (charSize * lineHeight)); // use lineHeight

    const tempCanvas = new OffscreenCanvas(sampW, sampH);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(input, 0, 0, sampW, sampH);
    const sampData = tempCtx.getImageData(0, 0, sampW, sampH);
    const pixels = sampData.data;

    let edgeData: Uint8ClampedArray | null = null;
    if (edgeEnhanced) {
      // simple edge detection on the downsampled image
      edgeData = new Uint8ClampedArray(sampW * sampH);
      for (let y = 1; y < sampH - 1; y++) {
        for (let x = 1; x < sampW - 1; x++) {
          const idx = (y * sampW + x) * 4;
          const left = (y * sampW + (x - 1)) * 4;
          const right = (y * sampW + (x + 1)) * 4;
          const top = ((y - 1) * sampW + x) * 4;
          const bottom = ((y + 1) * sampW + x) * 4;
          
          const gx = (pixels[right] - pixels[left]);
          const gy = (pixels[bottom] - pixels[top]);
          const mag = Math.sqrt(gx*gx + gy*gy);
          edgeData[y * sampW + x] = mag > 30 ? 255 : 0;
        }
      }
    }

    outCtx.fillStyle = invert ? "#ffffff" : "#000000";
    outCtx.fillRect(0, 0, w, h);

    outCtx.font = `${charSize}px ${fontFamily}`;
    outCtx.textAlign = "center";
    outCtx.textBaseline = "middle";

    for (let sy = 0; sy < sampH; sy++) {
      for (let sx = 0; sx < sampW; sx++) {
        const pi = (sy * sampW + sx) * 4;
        const r = pixels[pi];
        const g = pixels[pi + 1];
        const b = pixels[pi + 2];

        let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        brightness = brightness * globalBrightness;
        if (gamma !== 1.0) {
          brightness = Math.pow(brightness, 1 / gamma);
        }
        brightness = Math.min(1.0, Math.max(0.0, (brightness - 0.5) * contrast + 0.5));
        
        let charIndex = Math.floor(brightness * (chars.length - 1));
        
        if (edgeEnhanced && edgeData) {
          if (edgeData[sy * sampW + sx] > 0) {
             charIndex = chars.length - 1; // max density for edges
             brightness = 1.0;
          }
        }
        
        if (invert) {
           charIndex = (chars.length - 1) - charIndex;
        }

        const char = chars[charIndex];

        if (char === " " && !invert) continue;
        if (char === " " && invert && brightness > 0.9) continue;

        if (monochrome) {
          const luma = invert ? 0 : 255;
          outCtx.fillStyle = `rgb(${luma},${luma},${luma})`;
        } else {
          outCtx.fillStyle = `rgb(${r},${g},${b})`;
        }

        outCtx.fillText(
          char,
          sx * (charSize * charSpacing) + (charSize * charSpacing) / 2,
          sy * (charSize * lineHeight) + (charSize * lineHeight) / 2
        );
      }
    }

    if (glowAmount > 0) {
      const glowCanvas = new OffscreenCanvas(w, h);
      const glowCtx = glowCanvas.getContext("2d")!;
      glowCtx.filter = `blur(${glowRadius}px)`;
      glowCtx.drawImage(output, 0, 0);

      outCtx.globalCompositeOperation = invert ? "multiply" : "screen";
      outCtx.globalAlpha = glowAmount;
      outCtx.drawImage(glowCanvas, 0, 0);
      outCtx.globalCompositeOperation = "source-over";
      outCtx.globalAlpha = 1.0;
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

pluginRegistry.register("asciikit", "ASCIIKit", "retro", ASCIIKit);
