import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class ImageTrack implements EffectPlugin {
  readonly id = "imagetrack";
  readonly name = "ImageTrack";
  readonly category: EffectCategory = "tracking";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    edgeThreshold1: 50,
    edgeThreshold2: 150,
    showEdges: true,
    showCentroids: true,
    showShapes: true,
    targetLock: false,
    overlayColor: "#00D4FF",
    edgeOpacity: 40,
    contourSimplify: 3,
  };

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "edgeThreshold1", name: "Edge Low", type: "number", defaultValue: 50, min: 0, max: 255, step: 1, group: "Detection" },
      { id: "edgeThreshold2", name: "Edge High", type: "number", defaultValue: 150, min: 0, max: 255, step: 1, group: "Detection" },
      { id: "contourSimplify", name: "Simplify", type: "number", defaultValue: 3, min: 1, max: 20, step: 1, group: "Detection" },
      { id: "showEdges", name: "Show Edges", type: "boolean", defaultValue: true, group: "Overlay" },
      { id: "showCentroids", name: "Show Centroids", type: "boolean", defaultValue: true, group: "Overlay" },
      { id: "showShapes", name: "Shape Labels", type: "boolean", defaultValue: true, group: "Overlay" },
      { id: "targetLock", name: "Target Lock", type: "boolean", defaultValue: false, group: "Overlay" },
      { id: "overlayColor", name: "Overlay Color", type: "color", defaultValue: "#00D4FF", group: "Overlay" },
      { id: "edgeOpacity", name: "Edge Opacity", type: "number", defaultValue: 40, min: 0, max: 100, step: 1, group: "Overlay" },
    ];
  }

  private sobelEdgeDetection(
    data: Uint8ClampedArray,
    w: number,
    h: number,
    low: number,
    high: number
  ): Uint8ClampedArray {
    const result = new Uint8ClampedArray(w * h * 4);

    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
    }

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        // Sobel kernels
        const gx =
          -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)] +
          -2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)] +
          -gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];

        const gy =
          -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)] +
          gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const idx = (y * w + x) * 4;

        if (magnitude > high) {
          result[idx] = result[idx + 1] = result[idx + 2] = 255;
        } else if (magnitude > low) {
          result[idx] = result[idx + 1] = result[idx + 2] = 128;
        }
        result[idx + 3] = 255;
      }
    }

    return result;
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const w = output.width, h = output.height;
    const threshold1 = this.parameters.edgeThreshold1 as number;
    const threshold2 = this.parameters.edgeThreshold2 as number;
    const showEdges = this.parameters.showEdges as boolean;
    const showCentroids = this.parameters.showCentroids as boolean;
    const showShapes = this.parameters.showShapes as boolean;
    const targetLock = this.parameters.targetLock as boolean;
    const overlayColor = this.parameters.overlayColor as string;
    const edgeOpacity = this.parameters.edgeOpacity as number;

    // Draw source
    outCtx.drawImage(input, 0, 0);

    // Process at reduced resolution
    const scale = 2;
    const sw = Math.floor(w / scale);
    const sh = Math.floor(h / scale);
    const tempCanvas = new OffscreenCanvas(sw, sh);
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    tempCtx.drawImage(input, 0, 0, sw, sh);
    const srcData = tempCtx.getImageData(0, 0, sw, sh);

    // Edge detection
    const edges = this.sobelEdgeDetection(srcData.data, sw, sh, threshold1, threshold2);

    // Show edge overlay
    if (showEdges) {
      const edgeCanvas = new OffscreenCanvas(sw, sh);
      const edgeCtx = edgeCanvas.getContext("2d")!;
      // Colorize edges
      const coloredEdges = new ImageData(sw, sh);
      const color = this.hexToRgb(overlayColor);
      for (let i = 0; i < edges.length; i += 4) {
        if (edges[i] > 0) {
          coloredEdges.data[i] = color[0];
          coloredEdges.data[i + 1] = color[1];
          coloredEdges.data[i + 2] = color[2];
          coloredEdges.data[i + 3] = Math.round(edges[i] * edgeOpacity / 100);
        }
      }
      edgeCtx.putImageData(coloredEdges, 0, 0);
      outCtx.globalCompositeOperation = "screen";
      outCtx.drawImage(edgeCanvas, 0, 0, w, h);
      outCtx.globalCompositeOperation = "source-over";
    }

    // Find centroids of edge clusters
    if (showCentroids || showShapes || targetLock) {
      const clusters = this.findCentroids(edges, sw, sh);

      for (const cluster of clusters) {
        const cx = cluster.cx * scale;
        const cy = cluster.cy * scale;
        const cw = cluster.w * scale;
        const ch = cluster.h * scale;

        if (showCentroids) {
          // Centroid marker
          outCtx.strokeStyle = overlayColor;
          outCtx.lineWidth = 1;
          outCtx.beginPath();
          outCtx.arc(cx, cy, 8, 0, Math.PI * 2);
          outCtx.stroke();
          outCtx.beginPath();
          outCtx.arc(cx, cy, 2, 0, Math.PI * 2);
          outCtx.fillStyle = overlayColor;
          outCtx.fill();

          // Crosshair lines
          outCtx.setLineDash([3, 3]);
          outCtx.beginPath();
          outCtx.moveTo(cx - 15, cy); outCtx.lineTo(cx + 15, cy);
          outCtx.moveTo(cx, cy - 15); outCtx.lineTo(cx, cy + 15);
          outCtx.stroke();
          outCtx.setLineDash([]);
        }

        if (showShapes) {
          // Simple shape classification based on aspect ratio
          const ratio = cw / (ch || 1);
          let shape = "OBJECT";
          if (ratio > 0.9 && ratio < 1.1) shape = "SQUARE";
          else if (ratio > 1.5) shape = "WIDE";
          else if (ratio < 0.67) shape = "TALL";

          outCtx.fillStyle = overlayColor;
          outCtx.font = "10px monospace";
          outCtx.fillText(`${shape} [${Math.round(cx)},${Math.round(cy)}]`, cx + 12, cy - 5);
        }
      }

      // Target lock on largest cluster
      if (targetLock && clusters.length > 0) {
        const largest = clusters[0];
        const lx = largest.cx * scale;
        const ly = largest.cy * scale;
        const size = 40 + Math.sin(ctx.time * 4) * 5;

        outCtx.strokeStyle = overlayColor;
        outCtx.lineWidth = 2;
        outCtx.beginPath();
        outCtx.arc(lx, ly, size, 0, Math.PI * 2);
        outCtx.stroke();
        outCtx.beginPath();
        outCtx.arc(lx, ly, size * 0.6, -Math.PI / 4, Math.PI / 4);
        outCtx.stroke();
        outCtx.beginPath();
        outCtx.arc(lx, ly, size * 0.6, Math.PI * 3 / 4, Math.PI * 5 / 4);
        outCtx.stroke();

        outCtx.fillStyle = overlayColor;
        outCtx.font = "bold 12px monospace";
        outCtx.fillText("◉ LOCKED", lx + size + 8, ly);
      }
    }
  }

  private findCentroids(
    edgeData: Uint8ClampedArray,
    w: number,
    h: number
  ): Array<{ cx: number; cy: number; w: number; h: number; area: number }> {
    // Simple grid-based clustering
    const gridSize = 32;
    const gridW = Math.ceil(w / gridSize);
    const gridH = Math.ceil(h / gridSize);
    const grid = new Float32Array(gridW * gridH);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (edgeData[(y * w + x) * 4] > 0) {
          const gx = Math.floor(x / gridSize);
          const gy = Math.floor(y / gridSize);
          grid[gy * gridW + gx]++;
        }
      }
    }

    const results: Array<{ cx: number; cy: number; w: number; h: number; area: number }> = [];
    const threshold = gridSize * gridSize * 0.05;

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        if (grid[gy * gridW + gx] > threshold) {
          results.push({
            cx: gx * gridSize + gridSize / 2,
            cy: gy * gridSize + gridSize / 2,
            w: gridSize,
            h: gridSize,
            area: grid[gy * gridW + gx],
          });
        }
      }
    }

    return results.sort((a, b) => b.area - a.area).slice(0, 10);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const v = parseInt(hex.replace("#", ""), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
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

pluginRegistry.register("imagetrack", "ImageTrack", "tracking", ImageTrack);
