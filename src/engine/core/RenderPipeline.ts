import type {
  EffectPlugin,
  RenderContext,
  SerializedEffect,
  ConsoleEntry,
} from "@/types";
import { pluginRegistry } from "./PluginRegistry";

export class RenderPipeline {
  private effects: EffectPlugin[] = [];
  private inputCanvas: OffscreenCanvas;
  private outputCanvas: OffscreenCanvas;
  private bufferA: OffscreenCanvas;
  private bufferB: OffscreenCanvas;
  private context: RenderContext;
  private frameCount = 0;
  private startTime = 0;
  private lastFrameTime = 0;
  private logCallback: ((entry: ConsoleEntry) => void) | null = null;

  constructor(width = 1920, height = 1080) {
    this.inputCanvas = new OffscreenCanvas(width, height);
    this.outputCanvas = new OffscreenCanvas(width, height);
    this.bufferA = new OffscreenCanvas(width, height);
    this.bufferB = new OffscreenCanvas(width, height);
    this.startTime = performance.now();
    this.context = {
      mode: "viewport",
      quality: "preview",
      width,
      height,
      time: 0,
      deltaTime: 0,
      frame: 0,
      totalFrames: 1,
      mouseX: 0,
      mouseY: 0,
      isPlaying: false,
      mediaTime: 0,
    };
    this.lastFrameTime = performance.now();
  }

  setLogCallback(cb: (entry: ConsoleEntry) => void): void {
    this.logCallback = cb;
  }

  private log(level: ConsoleEntry["level"], message: string, source?: string): void {
    if (this.logCallback) {
      this.logCallback({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        level,
        message,
        source,
      });
    }
  }

  resize(width: number, height: number): void {
    this.context.width = width;
    this.context.height = height;
    for (const c of [this.inputCanvas, this.outputCanvas, this.bufferA, this.bufferB]) {
      c.width = width;
      c.height = height;
    }
  }

  async updateEffects(serializedEffects: SerializedEffect[]): Promise<void> {
    const newInstances: EffectPlugin[] = [];
    const newIds = new Set(serializedEffects.map(e => e.instanceId));
    
    // Destroy effects that were removed
    for (const effect of this.effects) {
      if (!newIds.has(effect.instanceId)) {
        effect.destroy();
      }
    }

    for (const data of serializedEffects) {
      // Find existing instance
      let instance = this.effects.find(e => e.instanceId === data.instanceId);
      
      if (instance) {
        // Just update parameters if it already exists (preserves buffer state)
        instance.deserialize(data);
        newInstances.push(instance);
      } else {
        // Create new instance
        const entry = pluginRegistry.get(data.id);
        if (entry) {
          instance = new entry.ctor();
          instance.deserialize(data);
          try {
            await instance.initialize();
            newInstances.push(instance);
            this.log("info", `Initialized: ${instance.name}`, "Pipeline");
          } catch (err) {
            this.log("error", `Failed to init ${instance.name}: ${err}`, "Pipeline");
          }
        }
      }
    }
    
    this.effects = newInstances;
  }

  async renderFrame(sourceBitmap: ImageBitmap, ctx: Partial<RenderContext> = {}): Promise<number> {
    const frameStart = performance.now();
    const now = performance.now();

    this.context.time = (now - this.startTime) / 1000;
    this.context.deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.context.frame = this.frameCount;
    if (ctx.mouseX !== undefined) this.context.mouseX = ctx.mouseX;
    if (ctx.mouseY !== undefined) this.context.mouseY = ctx.mouseY;
    if (ctx.isPlaying !== undefined) this.context.isPlaying = ctx.isPlaying;
    if (ctx.mediaTime !== undefined) this.context.mediaTime = ctx.mediaTime;
    if (ctx.mode !== undefined) this.context.mode = ctx.mode;
    if (ctx.quality !== undefined) this.context.quality = ctx.quality;
    if (ctx.totalFrames !== undefined) this.context.totalFrames = ctx.totalFrames;

    // Draw source to input buffer
    const inputCtx = this.inputCanvas.getContext("2d")!;
    inputCtx.clearRect(0, 0, this.context.width, this.context.height);
    inputCtx.drawImage(sourceBitmap, 0, 0, this.context.width, this.context.height);
    sourceBitmap.close();

    // Process through effect chain using double buffering
    const enabledEffects = this.effects.filter((e) => e.enabled);

    if (enabledEffects.length === 0) {
      // No effects — copy input directly to output
      const outCtx = this.outputCanvas.getContext("2d")!;
      outCtx.clearRect(0, 0, this.context.width, this.context.height);
      outCtx.drawImage(this.inputCanvas, 0, 0);
    } else {
      let currentInput: OffscreenCanvas = this.inputCanvas;
      let currentOutput: OffscreenCanvas = this.bufferA;
      let useBufferA = true;

      for (let i = 0; i < enabledEffects.length; i++) {
        const effect = enabledEffects[i];
        const effectStart = performance.now();

        // Clear output buffer
        const outCtx = currentOutput.getContext("2d")!;
        outCtx.clearRect(0, 0, this.context.width, this.context.height);

        try {
          await effect.process(currentInput, currentOutput, this.context);
        } catch (err) {
          this.log("error", `Effect ${effect.name} failed: ${err}`, effect.name);
          // On error, copy input to output
          outCtx.drawImage(currentInput, 0, 0);
        }

        const effectTime = performance.now() - effectStart;
        if (effectTime > 16 && this.frameCount % 60 === 0) {
          this.log("timing", `${effect.name}: ${effectTime.toFixed(1)}ms`, "Perf");
        }

        // Swap buffers for next pass
        currentInput = currentOutput;
        useBufferA = !useBufferA;
        currentOutput = useBufferA ? this.bufferA : this.bufferB;
      }

      // Copy final result to output canvas
      const finalCtx = this.outputCanvas.getContext("2d")!;
      finalCtx.clearRect(0, 0, this.context.width, this.context.height);
      finalCtx.drawImage(currentInput, 0, 0);
    }

    this.frameCount++;
    return performance.now() - frameStart;
  }

  getOutputCanvas(): OffscreenCanvas {
    return this.outputCanvas;
  }

  destroy(): void {
    for (const effect of this.effects) {
      effect.destroy();
    }
    this.effects = [];
  }
}
