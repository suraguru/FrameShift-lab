// Web Worker polyfill — must run before any imports
if (typeof self !== "undefined" && !self.matchMedia) {
  (self as any).matchMedia = function () {
    return { matches: false, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {} };
  };
}

import * as MP4Box from "mp4box";

let pendingFrames = 0;

self.onmessage = async (e) => {
  if (e.data.type === "ACK") {
    pendingFrames--;
    return;
  }

  if (e.data.type === "INIT_DECODE") {
    const file: File = e.data.payload.file;
    const targetFps = e.data.payload.fps;
    
    // We will use mp4box to parse the file
    const mp4boxfile = MP4Box.createFile();
    
    let videoTrack: any = null;
    let decoder: VideoDecoder | undefined;
    let frameCount = 0;

    mp4boxfile.onReady = (info: any) => {
      videoTrack = info.videoTracks[0];
      if (!videoTrack) {
        self.postMessage({ type: "ERROR", payload: "No video track found" });
        return;
      }

      mp4boxfile.setExtractionOptions(videoTrack.id);
      mp4boxfile.start();

      decoder = new VideoDecoder({
        output: (frame) => {
          frameCount++;
          pendingFrames++;
          // We can transfer the VideoFrame to the caller
          (self as any).postMessage({
            type: "FRAME_DECODED",
            payload: { frame, frameIndex: frameCount }
          }, [frame]);
        },
        error: (e) => {
          self.postMessage({ type: "ERROR", payload: e.message });
        }
      });

      // Extract codec description as ArrayBuffer from mp4box parsed box tree
      // VideoDecoderConfig.description requires an ArrayBuffer (not the hex string from codec_private_data)
      const trak = mp4boxfile.getTrackById(videoTrack.id);
      let description: Uint8Array | undefined;
      for (const entry of trak.mdia.minf.stbl.stsd.entries) {
        const e = entry as any;
        const box = e.avcC || e.hvcC || e.vpcC || e.av1C;
        if (box) {
          const stream = new (MP4Box as any).DataStream(undefined, 0, (MP4Box as any).DataStream.BIG_ENDIAN);
          box.write(stream);
          // Skip the 8-byte box header (size + type)
          description = new Uint8Array(stream.buffer, 8);
          break;
        }
      }

      decoder.configure({
        codec: videoTrack.codec,
        codedWidth: videoTrack.video.width,
        codedHeight: videoTrack.video.height,
        ...(description ? { description } : {}),
      });
    };

    mp4boxfile.onSamples = (id: number, user: any, samples: any[]) => {
      for (const sample of samples) {
        const chunk = new EncodedVideoChunk({
          type: sample.is_sync ? "key" : "delta",
          timestamp: (sample.cts * 1000000) / sample.timescale,
          duration: (sample.duration * 1000000) / sample.timescale,
          data: sample.data
        });
        decoder!.decode(chunk);
      }
    };

    // Read file in chunks to feed mp4box
    const reader = file.stream().getReader();
    let offset = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Backpressure: Wait if decoder queue or pipeline is full (limit to 30 frames in-flight)
      while ((decoder !== undefined && decoder.decodeQueueSize >= 20) || pendingFrames >= 20) {
        await new Promise(r => setTimeout(r, 10));
      }

      const buffer = value.buffer as any;
      buffer.fileStart = offset;
      offset += buffer.byteLength;
      mp4boxfile.appendBuffer(buffer);
    }
    
    mp4boxfile.flush();
    
    // Wait for decoding to finish
    await decoder!.flush();
    self.postMessage({ type: "DECODE_COMPLETE" });
  }
};
