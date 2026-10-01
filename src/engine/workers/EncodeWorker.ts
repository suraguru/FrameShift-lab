// Web Worker polyfill — must run before any imports
if (typeof self !== "undefined" && !self.matchMedia) {
  (self as any).matchMedia = function () {
    return { matches: false, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {} };
  };
}

// Diagnostic: catch any uncaught errors inside the worker
self.addEventListener("error", (e) => {
  console.error("[EncodeWorker] Uncaught error:", e.message, e.filename, e.lineno);
  self.postMessage({ type: "ERROR", payload: { message: `Uncaught: ${e.message} at ${e.filename}:${e.lineno}` } });
});
self.addEventListener("unhandledrejection", (e: any) => {
  console.error("[EncodeWorker] Unhandled rejection:", e.reason);
  self.postMessage({ type: "ERROR", payload: { message: `Unhandled rejection: ${e.reason}` } });
});

console.log("[EncodeWorker] Polyfill done, loading imports...");

import * as MP4Box from "mp4box";
import JSZip from "jszip";
import type { ExportOptions } from "@/types";

console.log("[EncodeWorker] All imports loaded successfully");

let encoder: VideoEncoder | null = null;
let mp4boxfile: any = null;
let videoTrackId: number = -1;
let zip: JSZip | null = null;
let options: ExportOptions | null = null;
let frameCount = 0;
let encodeWidth = 1920;
let encodeHeight = 1080;

// Helper to convert ImageBitmap to PNG ArrayBuffer
async function bitmapToPNG(bitmap: ImageBitmap): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return await blob.arrayBuffer();
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;
  console.log("[EncodeWorker] Received message:", type);

  if (type === "INIT_ENCODE") {
    try {
      options = payload.options;
      encodeWidth = payload.width;
      encodeHeight = payload.height;
      frameCount = 0;
      videoTrackId = -1;
      
      if (options!.format === "png_sequence") {
        zip = new JSZip();
        self.postMessage({ type: "ENCODE_READY" });
      } else if (options!.format === "mp4" || options!.format === "webm") {
        // Initialize MP4Box for muxing
        mp4boxfile = (MP4Box as any).createFile();
        
        encoder = new VideoEncoder({
          output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => {
            // On first chunk with decoder config, create the track
            if (videoTrackId === -1 && metadata?.decoderConfig) {
              const trackOpts: any = {
                timescale: options!.fps * 1000, // Use high timescale for precision
                width: encodeWidth,
                height: encodeHeight,
                nb_samples: 0,
                brands: ["isom", "iso2", "avc1", "mp41"],
              };

              // For H.264, attach the avcC description
              if (metadata.decoderConfig.description) {
                trackOpts.avcDecoderConfigRecord = metadata.decoderConfig.description;
              }

              videoTrackId = mp4boxfile.addTrack(trackOpts);
              console.log("[EncodeWorker] MP4 track created, id:", videoTrackId);
            }
            
            if (videoTrackId !== -1) {
              const buffer = new ArrayBuffer(chunk.byteLength);
              chunk.copyTo(buffer);

              // Duration in timescale units: 1 frame = timescale / fps = 1000
              const sampleDuration = 1000;
              const sampleNumber = mp4boxfile.getTrackById(videoTrackId)?.samples?.length || 0;
              const sampleDts = sampleNumber * sampleDuration;
              
              mp4boxfile.addSample(videoTrackId, buffer, {
                duration: sampleDuration,
                dts: sampleDts,
                cts: sampleDts,
                is_sync: chunk.type === "key"
              });
            }
          },
          error: (err: DOMException) => {
            console.error("[EncodeWorker] VideoEncoder error:", err);
            self.postMessage({ type: "ERROR", payload: { message: `VideoEncoder: ${err.message}` } });
          }
        });
        
        self.postMessage({ type: "ENCODE_READY" });
      }
    } catch (err: any) {
      self.postMessage({ type: "ERROR", payload: { message: `EncodeWorker INIT failed: ${err.message}` } });
    }
  }

  else if (type === "ADD_FRAME") {
    const { bitmap } = payload;
    frameCount++;

    if (options!.format === "png_sequence") {
      const pngBuffer = await bitmapToPNG(bitmap);
      const filename = `frame_${frameCount.toString().padStart(6, '0')}.png`;
      zip!.file(filename, pngBuffer);
      self.postMessage({ type: "FRAME_ENCODED" });
    } 
    else if (options!.format === "mp4" || options!.format === "webm") {
      if (encoder!.state === "unconfigured") {
        encoder!.configure({
          codec: options!.format === "mp4" ? "avc1.42E01E" : "vp09.00.10.08",
          width: bitmap.width,
          height: bitmap.height,
          bitrate: options!.bitrate * 1000,
          framerate: options!.fps,
          hardwareAcceleration: "prefer-hardware",
        });
      }

      // Timestamp in microseconds: frameIndex / fps * 1_000_000
      const timestampUs = ((frameCount - 1) / options!.fps) * 1_000_000;
      const frame = new VideoFrame(bitmap, { timestamp: timestampUs });
      // Request keyframe every 2 seconds
      encoder!.encode(frame, { keyFrame: frameCount % (options!.fps * 2) === 1 });
      frame.close();
      
      // Wait for encoder queue to drain to prevent memory bloat, but do NOT flush!
      while (encoder!.encodeQueueSize >= 15) {
        await new Promise(r => setTimeout(r, 10));
      }
      
      self.postMessage({ type: "FRAME_ENCODED" });
    }
    bitmap.close();
  }

  else if (type === "FINALIZE") {
    try {
      if (options!.format === "png_sequence") {
        self.postMessage({ type: "LOG", payload: { level: "info", message: "Zipping sequence..." } });
        const blob = await zip!.generateAsync({ type: "blob" });
        self.postMessage({ type: "ENCODE_COMPLETE", payload: { blob, filename: "sequence.zip" } });
      } 
      else if (options!.format === "mp4" || options!.format === "webm") {
        console.log("[EncodeWorker] Flushing encoder...", frameCount, "frames");
        await encoder!.flush();
        encoder!.close();
        console.log("[EncodeWorker] Encoder flushed and closed");
        
        // Serialize the MP4 file using DataStream
        const stream = new (MP4Box as any).DataStream();
        stream.endianness = (MP4Box as any).DataStream.BIG_ENDIAN;
        mp4boxfile.write(stream);
        
        console.log("[EncodeWorker] MP4 serialized, size:", stream.buffer.byteLength);
        
        const blob = new Blob([stream.buffer], { type: options!.format === "mp4" ? "video/mp4" : "video/webm" });
        self.postMessage({ type: "ENCODE_COMPLETE", payload: { blob, filename: `export.${options!.format}` } });
      }
    } catch (err: any) {
      console.error("[EncodeWorker] FINALIZE error:", err);
      self.postMessage({ type: "ERROR", payload: { message: `Finalize failed: ${err.message}` } });
    }
  }
};
