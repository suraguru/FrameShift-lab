import type {
  EffectPlugin, EffectParameter, EffectCategory, RenderContext, SerializedEffect,
} from "@/types";
import { pluginRegistry } from "../core/PluginRegistry";

export class BabyTrack implements EffectPlugin {
  readonly id = "babytrack";
  readonly name = "BabyTrack";
  readonly category: EffectCategory = "tracking";
  instanceId = "";
  enabled = true;

  parameters: Record<string, number | boolean | string | number[]> = {
    threshold: 120,
    minArea: 500,
    maxArea: 50000,
    showBoundingBoxes: true,
    showConstellations: true,
    showCrosshairs: false,
    showTrails: false,
    labelMode: 1, // 0 = None, 1 = Coordinates, 2 = Strings
    boxColor: "#FFFFFF",
    trailLength: 30,
    motionDetection: false,
  };

  private prevFrame: ImageData | null = null;
  private trailBuffer: Array<{ x: number; y: number; t: number; id: number; active: boolean }> = Array.from({length: 2000}, () => ({x: 0, y: 0, t: 0, id: 0, active: false}));
  private trailHead = 0;
  private trailCount = 0;

  async initialize(): Promise<void> {}

  getParameters(): EffectParameter[] {
    return [
      { id: "threshold", name: "Threshold", type: "number", defaultValue: 120, min: 0, max: 255, step: 1, group: "Detection" },
      { id: "minArea", name: "Min Area", type: "number", defaultValue: 500, min: 10, max: 10000, step: 10, group: "Detection" },
      { id: "maxArea", name: "Max Area", type: "number", defaultValue: 50000, min: 1000, max: 500000, step: 100, group: "Detection" },
      { id: "motionDetection", name: "Motion Detection", type: "boolean", defaultValue: false, group: "Detection" },
      { id: "showBoundingBoxes", name: "Bounding Boxes", type: "boolean", defaultValue: true, group: "Overlay" },
      { id: "showConstellations", name: "Constellations", type: "boolean", defaultValue: true, group: "Overlay" },
      { id: "showCrosshairs", name: "Crosshairs", type: "boolean", defaultValue: false, group: "Overlay" },
      { id: "showTrails", name: "Motion Trails", type: "boolean", defaultValue: false, group: "Overlay" },
      { id: "trailLength", name: "Trail Length", type: "number", defaultValue: 30, min: 5, max: 100, step: 1, group: "Overlay" },
      { id: "labelMode", name: "Label Mode", type: "number", defaultValue: 1, min: 0, max: 2, step: 1, group: "Overlay" },
      { id: "boxColor", name: "Overlay Color", type: "color", defaultValue: "#FFFFFF", group: "Overlay" },
    ];
  }

  private findContours(
    binaryData: Uint8ClampedArray,
    w: number,
    h: number,
    minArea: number,
    maxArea: number
  ): Array<{ x: number; y: number; w: number; h: number; cx: number; cy: number; area: number }> {
    const visited = new Uint8Array(w * h);
    const regions: Array<{ minX: number; minY: number; maxX: number; maxY: number; count: number }> = [];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (visited[idx] || binaryData[idx * 4] === 0) continue;

        const stack = [idx];
        let minX = x, maxX = x, minY = y, maxY = y, count = 0;
        
        while (stack.length > 0) {
          const ci = stack.pop()!;
          if (visited[ci]) continue;
          visited[ci] = 1;
          count++;

          const cx = ci % w, cy = Math.floor(ci / w);
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [ci - 1, ci + 1, ci - w, ci + w];
          for (const ni of neighbors) {
            if (ni >= 0 && ni < w * h && !visited[ni] && binaryData[ni * 4] > 0) {
              stack.push(ni);
            }
          }

          if (count > maxArea * 2) break;
        }

        if (count >= minArea && count <= maxArea) {
          regions.push({ minX, minY, maxX, maxY, count });
        }
      }
    }

    return regions.map((r) => ({
      x: r.minX,
      y: r.minY,
      w: r.maxX - r.minX,
      h: r.maxY - r.minY,
      cx: (r.minX + r.maxX) / 2,
      cy: (r.minY + r.maxY) / 2,
      area: r.count,
    })).slice(0, 15); // Reduced limit for cleaner aesthetic
  }

  async process(
    input: OffscreenCanvas | HTMLCanvasElement,
    output: OffscreenCanvas | HTMLCanvasElement,
    ctx: RenderContext
  ): Promise<void> {
    const outCtx = output.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!outCtx) return;

    const w = output.width, h = output.height;
    const threshold = this.parameters.threshold as number;
    const minArea = this.parameters.minArea as number;
    const maxArea = this.parameters.maxArea as number;
    const showBoxes = this.parameters.showBoundingBoxes as boolean;
    const showConstellations = this.parameters.showConstellations as boolean;
    const showCrosshairs = this.parameters.showCrosshairs as boolean;
    const showTrails = this.parameters.showTrails as boolean;
    const labelMode = this.parameters.labelMode as number;
    const boxColor = this.parameters.boxColor as string;
    const trailLength = this.parameters.trailLength as number;
    const motionDetection = this.parameters.motionDetection as boolean;

    outCtx.drawImage(input, 0, 0);

    const scaleDown = 4;
    const sw = Math.floor(w / scaleDown);
    const sh = Math.floor(h / scaleDown);

    const tempCanvas = new OffscreenCanvas(sw, sh);
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })!;
    tempCtx.drawImage(input, 0, 0, sw, sh);
    const currentFrame = tempCtx.getImageData(0, 0, sw, sh);

    const binaryData = new Uint8ClampedArray(currentFrame.data.length);

    if (motionDetection && this.prevFrame) {
      for (let i = 0; i < currentFrame.data.length; i += 4) {
        const diff = Math.abs(currentFrame.data[i] - this.prevFrame.data[i]) +
                     Math.abs(currentFrame.data[i + 1] - this.prevFrame.data[i + 1]) +
                     Math.abs(currentFrame.data[i + 2] - this.prevFrame.data[i + 2]);
        const val = diff > threshold ? 255 : 0;
        binaryData[i] = val; binaryData[i + 1] = val; binaryData[i + 2] = val; binaryData[i + 3] = 255;
      }
    } else {
      for (let i = 0; i < currentFrame.data.length; i += 4) {
        const avg = (currentFrame.data[i] * 0.299 + currentFrame.data[i + 1] * 0.587 + currentFrame.data[i + 2] * 0.114);
        const val = avg > threshold ? 255 : 0;
        binaryData[i] = val; binaryData[i + 1] = val; binaryData[i + 2] = val; binaryData[i + 3] = 255;
      }
    }

    this.prevFrame = new ImageData(new Uint8ClampedArray(currentFrame.data), sw, sh);

    const contours = this.findContours(binaryData, sw, sh, minArea / (scaleDown * scaleDown), maxArea / (scaleDown * scaleDown));

    const scaledContours = contours.map((c, i) => ({
      id: i,
      x: c.x * scaleDown,
      y: c.y * scaleDown,
      w: c.w * scaleDown,
      h: c.h * scaleDown,
      cx: c.cx * scaleDown,
      cy: c.cy * scaleDown,
      area: c.area * scaleDown * scaleDown,
    }));

    // Update trails
    if (showTrails) {
      if (ctx.isPlaying) {
        for (const c of scaledContours) {
          const pt = this.trailBuffer[this.trailHead];
          pt.x = c.cx; pt.y = c.cy; pt.t = ctx.time; pt.id = c.id; pt.active = true;
          this.trailHead = (this.trailHead + 1) % this.trailBuffer.length;
          if (this.trailCount < this.trailBuffer.length) this.trailCount++;
        }
        const cutoff = ctx.time - trailLength / 10;
        for (let i = 0; i < this.trailCount; i++) {
          const pt = this.trailBuffer[i];
          if (pt.active && pt.t <= cutoff) pt.active = false;
        }
      } else {
        for (let i = 0; i < this.trailCount; i++) {
           const pt = this.trailBuffer[i];
           if (pt.active) pt.t += ctx.deltaTime;
        }
      }
    }

    // Set clean vector aesthetic
    outCtx.lineWidth = 1;
    outCtx.lineJoin = "round";
    outCtx.strokeStyle = boxColor;
    outCtx.fillStyle = boxColor;
    outCtx.font = "italic 11px monospace"; // Adjusted to match the "Say it again" label style
    outCtx.textAlign = "left";

    // Draw Constellations (Network lines connecting centroids)
    if (showConstellations && scaledContours.length > 1) {
      outCtx.beginPath();
      outCtx.globalAlpha = 0.2;
      for (let i = 0; i < scaledContours.length; i++) {
        const c1 = scaledContours[i];
        const neighbors = [];
        for (let j = 0; j < scaledContours.length; j++) {
          if (i === j) continue;
          const c2 = scaledContours[j];
          const dist = Math.hypot(c1.cx - c2.cx, c1.cy - c2.cy);
          if (dist < Math.max(w, h) * 0.15) {
            neighbors.push({ c2, dist });
          }
        }
        neighbors.sort((a, b) => a.dist - b.dist);
        // Only connect to the 2 closest neighbors to prevent messy web
        for (let k = 0; k < Math.min(2, neighbors.length); k++) {
          outCtx.moveTo(c1.cx, c1.cy);
          outCtx.lineTo(neighbors[k].c2.cx, neighbors[k].c2.cy);
        }
      }
      outCtx.stroke();
      outCtx.globalAlpha = 1;
    }

    // Draw Trails as continuous vector paths
    if (showTrails && this.trailCount > 1) {
      outCtx.globalAlpha = 0.5;
      for (let id = 0; id < 30; id++) {
        const idTrails = [];
        for (let i = 0; i < this.trailCount; i++) {
           const idx = (this.trailHead - this.trailCount + i + this.trailBuffer.length) % this.trailBuffer.length;
           const pt = this.trailBuffer[idx];
           if (pt.active && pt.id === id) {
               idTrails.push(pt);
           }
        }
        
        if (idTrails.length > 1) {
          outCtx.beginPath();
          outCtx.moveTo(idTrails[0].x, idTrails[0].y);
          for (let i = 1; i < idTrails.length; i++) {
            if (idTrails[i].t - idTrails[i-1].t < 0.3) {
              // Draw bezier curves for smooth looping paths
              const xc = (idTrails[i-1].x + idTrails[i].x) / 2;
              const yc = (idTrails[i-1].y + idTrails[i].y) / 2;
              outCtx.quadraticCurveTo(idTrails[i-1].x, idTrails[i-1].y, xc, yc);
            } else {
              outCtx.moveTo(idTrails[i].x, idTrails[i].y);
            }
          }
          outCtx.stroke();
        }
      }
      outCtx.globalAlpha = 1;
    }

    const labels = ["Take me back", "Say it again", "To the feeling", "I'm losing myself", "Drifting", "Hold on"];

    // Draw Bounding Boxes and Labels
    for (let i = 0; i < scaledContours.length; i++) {
      const c = scaledContours[i];

      if (showBoxes) {
        // Thin crisp box
        outCtx.globalAlpha = 0.8;
        outCtx.strokeRect(c.x, c.y, c.w, c.h);

        // Tiny anchor boxes at corners for technical feel
        outCtx.globalAlpha = 1;
        outCtx.fillRect(c.x - 2, c.y - 2, 4, 4);
        outCtx.fillRect(c.x + c.w - 2, c.y + c.h - 2, 4, 4);

        if (labelMode > 0) {
          let labelText = "";
          if (labelMode === 1) {
             labelText = `${(c.cx/w).toFixed(3)}, ${(c.cy/h).toFixed(3)}`; // Coordinate style
          } else {
             labelText = labels[i % labels.length]; // String style
          }

          // Angled label leader line
          const lineLen = 20;
          outCtx.beginPath();
          outCtx.moveTo(c.x, c.y);
          outCtx.lineTo(c.x - lineLen, c.y - lineLen);
          
          const textWidth = outCtx.measureText(labelText).width;
          outCtx.lineTo(c.x - lineLen - textWidth - 5, c.y - lineLen);
          outCtx.stroke();

          // Label text
          outCtx.fillStyle = boxColor;
          outCtx.fillText(labelText, c.x - lineLen - textWidth, c.y - lineLen - 4);
        }
      }

      // Minimal Crosshairs
      if (showCrosshairs) {
        outCtx.beginPath();
        outCtx.moveTo(c.cx - 5, c.cy); outCtx.lineTo(c.cx + 5, c.cy);
        outCtx.moveTo(c.cx, c.cy - 5); outCtx.lineTo(c.cx, c.cy + 5);
        outCtx.stroke();
      }
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
    this.prevFrame = null;
    this.trailCount = 0;
  }
}

pluginRegistry.register("babytrack", "BabyTrack", "tracking", BabyTrack);
