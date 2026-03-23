import {
  createFile,
  DataStream,
  type Mp4BoxFile,
  type Mp4BoxSampleEntry,
  type Mp4BoxTrak,
} from "mp4box";

export interface DecoderResult {
  totalFrames: number;
  codec: string;
}

interface DecodedFrame {
  ts: number;
  bmp: ImageBitmap;
}

const CHUNK_SIZE = 2 * 1024 * 1024;
const SAMPLES_PER_BATCH = 30;

function boxToBytes(box: Mp4BoxSampleEntry): Uint8Array {
  const stream = new DataStream(undefined, 0);
  box.write(stream);
  return new Uint8Array(stream.buffer, 0, stream.position);
}

function getSampleEntry(trak: Mp4BoxTrak): Mp4BoxSampleEntry {
  const entries = trak?.mdia?.minf?.stbl?.stsd?.entries;
  if (!entries || !entries.length) {
    throw new Error("No stsd sample entries found in track");
  }
  return entries[0];
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(
    u8.byteOffset,
    u8.byteOffset + u8.byteLength,
  ) as ArrayBuffer;
}

function getCodecDescription(
  entry: Mp4BoxSampleEntry,
): ArrayBuffer | undefined {
  const cfgBox = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
  if (!cfgBox) return undefined;

  if (cfgBox instanceof ArrayBuffer) return cfgBox;
  if (cfgBox instanceof Uint8Array) return toArrayBuffer(cfgBox);

  const full = boxToBytes(cfgBox as Mp4BoxSampleEntry);
  if (full.byteLength <= 8) return undefined;
  return full.buffer.slice(
    full.byteOffset + 8,
    full.byteOffset + full.byteLength,
  ) as ArrayBuffer;
}

function findTrakById(mp4boxFile: Mp4BoxFile, trackId: number): Mp4BoxTrak {
  const traks = mp4boxFile.moov?.traks;
  if (!traks) throw new Error("mp4box moov/traks not available");
  const trak = traks.find((t) => t?.tkhd?.track_id === trackId);
  if (!trak) throw new Error(`Track ${trackId} not found in moov.traks`);
  return trak;
}

function toMicroseconds(value: number, timescale: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(timescale) ||
    timescale <= 0
  ) {
    return 0;
  }
  return Math.round((1e6 * value) / timescale);
}

async function appendFileInChunks(
  file: File,
  mp4boxFile: Mp4BoxFile,
  onChunkAppended?: (loaded: number, total: number) => void,
): Promise<void> {
  let offset = 0;

  while (offset < file.size) {
    const buf = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
    (buf as ArrayBuffer & { fileStart: number }).fileStart = offset;
    mp4boxFile.appendBuffer(buf);
    offset += buf.byteLength;
    onChunkAppended?.(offset, file.size);
  }
  mp4boxFile.flush();
}

export class WebCodecsDecoder {
  private bitmaps: ImageBitmap[] = [];
  private codec: string = "";

  public get totalFrames(): number {
    return this.bitmaps.length;
  }

  public get codecString(): string {
    return this.codec;
  }

  public async loadFile(
    file: File,
    onProgress: (msg: string) => void,
  ): Promise<DecoderResult> {
    if (!("VideoDecoder" in globalThis)) {
      throw new Error(
        "WebCodecs VideoDecoder is not available in this browser.",
      );
    }

    this.destroy();

    const mp4boxFile = createFile();

    let trackId: number;
    let decoder: VideoDecoder;
    let fatalError: Error | null = null;
    let expectedSamples: number | null = null;

    const frames: DecodedFrame[] = [];
    const pending = new Set<Promise<void>>();

    const setFatal = (err: unknown) => {
      if (!fatalError) {
        fatalError = err instanceof Error ? err : new Error(String(err));
      }
    };

    const ready = new Promise<void>((resolve, reject) => {
      mp4boxFile.onError = (e) => reject(new Error("mp4box error: " + e));

      mp4boxFile.onReady = (info) => {
        const videoTracks = info.tracks.filter((t) => t.video);
        if (!videoTracks.length) {
          reject(new Error("No video tracks found in MP4."));
          return;
        }

        const track = videoTracks[0];
        trackId = track.id;
        this.codec = track.codec;
        expectedSamples = track.nb_samples ?? null;

        const trak = findTrakById(mp4boxFile, trackId);
        const entry = getSampleEntry(trak);
        const description = getCodecDescription(entry);

        decoder = new VideoDecoder({
          output: (videoFrame) => {
            const ts = videoFrame.timestamp;
            const p = createImageBitmap(videoFrame)
              .then((bmp) => {
                frames.push({ ts, bmp });
              })
              .finally(() => {
                videoFrame.close();
              });
            pending.add(p);
            p.finally(() => pending.delete(p));
          },
          error: (err) => setFatal(err),
        });

        const config: VideoDecoderConfig = {
          codec: this.codec,
          codedWidth: entry.width,
          codedHeight: entry.height,
          description,
        };
        decoder.configure(config);

        mp4boxFile.setExtractionOptions(trackId, null, {
          nbSamples: SAMPLES_PER_BATCH,
        });
        mp4boxFile.start();
        resolve();
      };

      mp4boxFile.onSamples = (id, _user, samples) => {
        if (id !== trackId || fatalError) return;

        for (const s of samples) {
          if (fatalError) break;

          const ts = toMicroseconds(
            Number.isFinite(s.cts) ? s.cts : s.dts,
            s.timescale,
          );
          const dur = toMicroseconds(s.duration, s.timescale);

          const init: EncodedVideoChunkInit = {
            type: s.is_sync ? "key" : "delta",
            timestamp: ts,
            data: new Uint8Array(s.data),
          };
          if (dur > 0) {
            init.duration = dur;
          }

          try {
            decoder.decode(new EncodedVideoChunk(init));
          } catch (err) {
            setFatal(err);
            break;
          }
        }
      };
    });

    let lastPct = -1;
    const pump = appendFileInChunks(file, mp4boxFile, (loaded, total) => {
      const pct = Math.floor((loaded / total) * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        onProgress(`${pct}% read`);
      }
    });

    await ready;
    await pump;
    if (fatalError) throw fatalError;

    onProgress("100% read – flushing decoder…");

    try {
      await decoder!.flush();
    } catch (err) {
      setFatal(err);
    }
    await Promise.allSettled([...pending]);

    if (fatalError) throw fatalError;

    // Sort by presentation timestamp so index i is always the i-th frame
    frames.sort((a, b) => a.ts - b.ts);
    this.bitmaps = frames.map((f) => f.bmp);

    const got = this.bitmaps.length;
    const exp = expectedSamples;
    onProgress(`Decoded ${got}${exp ? " / expected " + exp : ""} frames`);

    return { totalFrames: this.bitmaps.length, codec: this.codec };
  }

  public getFrameAtIndex(index: number): ImageBitmap {
    if (index < 0 || index >= this.bitmaps.length) {
      throw new RangeError(
        `Frame index ${index} out of range [0, ${this.bitmaps.length - 1}]`,
      );
    }
    return this.bitmaps[index];
  }

  public destroy(): void {
    for (const bmp of this.bitmaps) {
      bmp.close();
    }
    this.bitmaps = [];
    this.codec = "";
  }
}
