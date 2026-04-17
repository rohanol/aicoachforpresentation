/**
 * Browser-side helpers for extracting audio (as WAV base64) and sampled
 * frames (as JPEG base64) from a user-uploaded video file.
 *
 * No mediarecorder, no microphone — works on a File object only.
 */

export type Extracted = {
  audioBase64: string;
  audioMimeType: "audio/wav";
  frames: string[]; // base64 jpeg without prefix
  durationSeconds: number;
};

const TARGET_SAMPLE_RATE = 16000;
const FRAME_COUNT = 6;
const FRAME_MAX_DIM = 512;
const FRAME_QUALITY = 0.7;

export type ExtractProgress = (stage: string, pct: number) => void;

export async function extractFromVideo(
  file: File,
  onProgress?: ExtractProgress,
): Promise<Extracted> {
  onProgress?.("Decoding audio…", 5);
  const arrayBuffer = await file.arrayBuffer();

  const audioCtx = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (e) {
    audioCtx.close();
    throw new Error(
      "Could not decode audio from this video. Try a different file (mp4 with AAC audio works best).",
    );
  }

  const durationSeconds = decoded.duration;
  onProgress?.("Resampling audio…", 20);

  // Downmix to mono + resample to 16kHz via OfflineAudioContext
  const offline = new OfflineAudioContext(
    1,
    Math.ceil(durationSeconds * TARGET_SAMPLE_RATE),
    TARGET_SAMPLE_RATE,
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  audioCtx.close();

  onProgress?.("Encoding audio…", 35);
  const wavBlob = encodeWav(rendered);
  const audioBase64 = await blobToBase64(wavBlob);

  onProgress?.("Sampling video frames…", 50);
  const frames = await sampleFrames(file, durationSeconds, (i, total) => {
    onProgress?.(
      `Sampling frame ${i + 1}/${total}…`,
      50 + Math.round((40 * (i + 1)) / total),
    );
  });

  onProgress?.("Ready to analyze…", 95);
  return {
    audioBase64,
    audioMimeType: "audio/wav",
    frames,
    durationSeconds,
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as any,
    );
  }
  return btoa(binary);
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const ab = new ArrayBuffer(bufferSize);
  const view = new DataView(ab);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
  }

  return new Blob([ab], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

async function sampleFrames(
  file: File,
  durationSeconds: number,
  onFrame: (i: number, total: number) => void,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not load video for frame extraction."));
    };

    video.onloadedmetadata = async () => {
      const total = FRAME_COUNT;
      const frames: string[] = [];
      try {
        const dur = isFinite(video.duration) && video.duration > 0
          ? video.duration
          : durationSeconds;

        for (let i = 0; i < total; i++) {
          // Skip first/last 5% to avoid black/transition frames
          const t = dur * (0.05 + (0.9 * i) / Math.max(1, total - 1));
          await seekTo(video, t);
          const dataUrl = drawToDataUrl(video);
          if (dataUrl) {
            frames.push(dataUrl.split(",")[1]);
          }
          onFrame(i, total);
        }
        cleanup();
        resolve(frames);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
  });
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      // small delay so the frame paints
      setTimeout(resolve, 30);
    };
    video.addEventListener("seeked", onSeeked);
    try {
      video.currentTime = Math.max(0, Math.min(t, video.duration - 0.05));
    } catch {
      resolve();
    }
  });
}

function drawToDataUrl(video: HTMLVideoElement): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(1, FRAME_MAX_DIM / Math.max(vw, vh));
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", FRAME_QUALITY);
}
