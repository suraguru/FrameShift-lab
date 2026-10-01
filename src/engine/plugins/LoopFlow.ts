import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class LoopFlow implements EffectPlugin {
  readonly id = "loopflow";
  readonly name = "LoopFlow";
  readonly category: EffectCategory = "motion";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    feedback: 40,
    feedbackZoom: 101,
    feedbackRotation: 0,
    motionAmplify: 0,
    flowVisualize: false,
    flowColor: "#00D4FF",
    blendMode: 0, // 0=normal, 1=screen, 2=multiply, 3=difference
    decay: 5,
    mirrorX: false,
    mirrorY: false,
  };

  private prevFrame: OffscreenCanvas | null = null;
  private prevGray: Float32Array | null = null;
  private flowField: Float32Array | null = null;
  private tempCanvas: OffscreenCanvas | null = null;
  private tempCtx: OffscreenCanvasRenderingContext2D | null = null;

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "feedback", name: "Feedback", type: "number", defaultValue: 40, min: 0, max: 100, step: 1, group: "Loop" },
      { id: "feedbackZoom", name: "Feedback Zoom", type: "number", defaultValue: 101, min: 90, max: 150, step: 0.5, group: "Loop" },
      { id: "feedbackRotation", name: "Feedback Rotate", type: "number", defaultValue: 0, min: -10, max: 10, step: 0.1, group: "Loop" },
      { id: "decay", name: "Trail Decay", type: "number", defaultValue: 5, min: 0, max: 50, step: 1, group: "Loop" },
      { id: "blendMode", name: "Blend Mode", type: "number", defaultValue: 0, min: 0, max: 3, step: 1, group: "Blend" },
      { id: "mirrorX", name: "Mirror X", type: "boolean", defaultValue: false, group: "Transform" },
      { id: "mirrorY", name: "Mirror Y", type: "boolean", defaultValue: false, group: "Transform" },
      { id: "motionAmplify", name: "Motion Amplify", type: "number", defaultValue: 0, min: 0, max: 100, step: 1, group: "Motion" },
      { id: "flowVisualize", name: "Show Flow", type: "boolean", defaultValue: false, group: "Motion" },
      { id: "flowColor", name: "Flow Color", type: "color", defaultValue: "#00D4FF", group: "Motion" },
    ];
  }

  private computeOpticalFlow(
    current: Uint8ClampedArray,
    previous: Float32Array,
    w: number,
    h: number
  ): { gray: Float32Array; flow: Float32Array } {
    const gray = new Float32Array(w * h);
    const flow = new Float32Array(w * h * 2); // dx, dy per pixel

    for (let i = 0; i < w * h; i++) {
      gray[i] = current[i * 4] * 0.299 + current[i * 4 + 1] * 0.587 + current[i * 4 + 2] * 0.114;
    }

    // Simple block-matching optical flow (4x4 blocks)
    const blockSize = 8;
    const searchRadius = 4;

    for (let by = 0; by < h - blockSize; by += blockSize) {
      for (let bx = 0; bx < w - blockSize; bx += blockSize) {
        let bestDx = 0, bestDy = 0, bestSad = Infinity;

        for (let sy = -searchRadius; sy <= searchRadius; sy++) {
          for (let sx = -searchRadius; sx <= searchRadius; sx++) {
            let sad = 0;
            for (let py = 0; py < blockSize; py++) {
              for (let px = 0; px < blockSize; px++) {
                const cy = by + py, cx = bx + px;
                const py2 = cy + sy, px2 = cx + sx;
                if (py2 >= 0 && py2 < h && px2 >= 0 && px2 < w) {
                  sad += Math.abs(gray[cy * w + cx] - previous[py2 * w + px2]);
                }
              }
            }
            if (sad < bestSad) { bestSad = sad; bestDx = sx; bestDy = sy; }
          }
        }

        // Fill block with flow vector
        for (let py = 0; py < blockSize; py++) {
          for (let px = 0; px < blockSize; px++) {
            const idx = ((by + py) * w + (bx + px)) * 2;
            flow[idx] = bestDx;
            flow[idx + 1] = bestDy;
          }
        }
      }
    }

    return { gray, flow };
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    _ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const w = output.width, h = output.height;
    const feedback = (this.parameters.feedback as number) / 100;
    const zoom = (this.parameters.feedbackZoom as number) / 100;
    const rotation = (this.parameters.feedbackRotation as number) * Math.PI / 180;
    const decay = (this.parameters.decay as number) / 100;
    const blendMode = this.parameters.blendMode as number;
    const mirrorX = this.parameters.mirrorX as boolean;
    const mirrorY = this.parameters.mirrorY as boolean;
    const motionAmplify = this.parameters.motionAmplify as number;
    const flowVisualize = this.parameters.flowVisualize as boolean;

    // Initialize previous frame buffer
    if (!this.prevFrame) {
      this.prevFrame = new OffscreenCanvas(w, h);
    }
    if (this.prevFrame.width !== w || this.prevFrame.height !== h) {
      this.prevFrame.width = w;
      this.prevFrame.height = h;
    }

    // Draw current frame
    outCtx.drawImage(input, 0, 0);

    // Apply feedback from previous frame
    if (feedback > 0) {
      const blendModes: GlobalCompositeOperation[] = ["source-over", "screen", "multiply", "difference"];
      outCtx.globalCompositeOperation = blendModes[blendMode] || "source-over";
      outCtx.globalAlpha = feedback;

      outCtx.save();
      const cx = w / 2, cy = h / 2;
      outCtx.translate(cx, cy);
      outCtx.scale(zoom * (mirrorX ? -1 : 1), zoom * (mirrorY ? -1 : 1));
      outCtx.rotate(rotation);
      outCtx.translate(-cx, -cy);
      outCtx.drawImage(this.prevFrame, 0, 0);
      outCtx.restore();

      outCtx.globalAlpha = 1;
      outCtx.globalCompositeOperation = "source-over";
    }

    // Decay: darken slightly to prevent infinite buildup
    if (decay > 0) {
      outCtx.fillStyle = `rgba(0,0,0,${decay * 0.3})`;
      outCtx.fillRect(0, 0, w, h);
    }

    // Motion amplification and flow visualization
    if ((motionAmplify > 0 || flowVisualize) && this.prevGray) {
      const flowScale = 4;
      const fw = Math.floor(w / flowScale);
      const fh = Math.floor(h / flowScale);

      if (!this.tempCanvas) {
        this.tempCanvas = new OffscreenCanvas(fw, fh);
        this.tempCtx = this.tempCanvas.getContext("2d", { willReadFrequently: true })!;
      } else if (this.tempCanvas.width !== fw || this.tempCanvas.height !== fh) {
        this.tempCanvas.width = fw;
        this.tempCanvas.height = fh;
      }
      
      this.tempCtx!.drawImage(input, 0, 0, fw, fh);
      const currentData = this.tempCtx!.getImageData(0, 0, fw, fh);

      const { gray, flow } = this.computeOpticalFlow(currentData.data, this.prevGray, fw, fh);

      // Flow visualization
      if (flowVisualize) {
        const flowColor = this.parameters.flowColor as string;
        outCtx.strokeStyle = flowColor;
        outCtx.lineWidth = 1;
        outCtx.globalAlpha = 0.6;

        const step = 12;
        for (let y = 0; y < fh; y += step) {
          for (let x = 0; x < fw; x += step) {
            const idx = (y * fw + x) * 2;
            const dx = flow[idx] * flowScale;
            const dy = flow[idx + 1] * flowScale;
            const mag = Math.sqrt(dx * dx + dy * dy);

            if (mag > 1) {
              const sx = x * flowScale, sy = y * flowScale;
              outCtx.beginPath();
              outCtx.moveTo(sx, sy);
              outCtx.lineTo(sx + dx * 3, sy + dy * 3);
              outCtx.stroke();
            }
          }
        }
        outCtx.globalAlpha = 1;
      }

      // Motion amplification
      if (motionAmplify > 0) {
        const imgData = outCtx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const factor = motionAmplify / 10;

        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            const flowIdx = (y * fw + x) * 2;
            const mag = Math.sqrt(flow[flowIdx] ** 2 + flow[flowIdx + 1] ** 2);

            if (mag > 0.5) {
              for (let py = 0; py < flowScale; py++) {
                for (let px = 0; px < flowScale; px++) {
                  const imgIdx = ((y * flowScale + py) * w + (x * flowScale + px)) * 4;
                  const boost = Math.min(30, mag * factor);
                  data[imgIdx] = Math.min(255, data[imgIdx] + boost);
                  data[imgIdx + 1] = Math.min(255, data[imgIdx + 1] + boost);
                  data[imgIdx + 2] = Math.min(255, data[imgIdx + 2] + boost);
                }
              }
            }
          }
        }
        outCtx.putImageData(imgData, 0, 0);
      }

      this.prevGray = gray;
    } else if (!this.prevGray) {
      // Initialize prevGray
      const flowScale = 4;
      const fw = Math.floor(w / flowScale);
      const fh = Math.floor(h / flowScale);
      if (!this.tempCanvas) {
        this.tempCanvas = new OffscreenCanvas(fw, fh);
        this.tempCtx = this.tempCanvas.getContext("2d", { willReadFrequently: true })!;
      } else if (this.tempCanvas.width !== fw || this.tempCanvas.height !== fh) {
        this.tempCanvas.width = fw;
        this.tempCanvas.height = fh;
      }
      this.tempCtx!.drawImage(input, 0, 0, fw, fh);
      const data = this.tempCtx!.getImageData(0, 0, fw, fh).data;
      this.prevGray = new Float32Array(fw * fh);
      for (let i = 0; i < fw * fh; i++) {
        this.prevGray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
      }
    }

    // Save current output for feedback
    const prevCtx = this.prevFrame.getContext("2d")!;
    prevCtx.clearRect(0, 0, w, h);
    prevCtx.drawImage(output, 0, 0);
  }

  serialize(): SerializedEffect {
    return { id: this.id, instanceId: this.instanceId, enabled: this.enabled, parameters: { ...this.parameters } };
  }
  deserialize(data: SerializedEffect): void {
    this.instanceId = data.instanceId; this.enabled = data.enabled;
    this.parameters = { ...this.parameters, ...data.parameters };
  }
  destroy(): void {
    this.prevFrame = null;
    this.prevGray = null;
    this.flowField = null;
    this.tempCanvas = null;
    this.tempCtx = null;
  }
}

pluginRegistry.register("loopflow", "LoopFlow", "motion", LoopFlow);
