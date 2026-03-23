declare module "mp4box" {
  export class DataStream {
    constructor(buffer: ArrayBuffer | undefined, offset: number);
    buffer: ArrayBuffer;
    position: number;
  }

  export interface Mp4BoxTrackInfo {
    id: number;
    codec: string;
    nb_samples: number;
    video?: {
      width: number;
      height: number;
    };
  }

  export interface Mp4BoxInfo {
    tracks: Mp4BoxTrackInfo[];
  }

  export interface Mp4BoxSampleEntry {
    width: number;
    height: number;
    avcC?: unknown;
    hvcC?: unknown;
    vpcC?: unknown;
    av1C?: unknown;
    write(stream: DataStream): void;
  }

  export interface Mp4BoxStsd {
    entries: Mp4BoxSampleEntry[];
  }

  export interface Mp4BoxTrak {
    tkhd?: { track_id: number };
    mdia?: {
      minf?: {
        stbl?: {
          stsd?: Mp4BoxStsd;
        };
      };
    };
  }

  export interface Mp4BoxSample {
    is_sync: boolean;
    cts: number;
    dts: number;
    duration: number;
    timescale: number;
    data: ArrayBuffer;
  }

  export interface Mp4BoxFile {
    moov?: { traks?: Mp4BoxTrak[] };
    onReady?: (info: Mp4BoxInfo) => void;
    onError?: (error: string) => void;
    onSamples?: (id: number, user: unknown, samples: Mp4BoxSample[]) => void;
    appendBuffer(buffer: ArrayBuffer & { fileStart?: number }): void;
    flush(): void;
    setExtractionOptions(
      trackId: number,
      user: unknown,
      options?: { nbSamples?: number },
    ): void;
    start(): void;
  }

  export function createFile(): Mp4BoxFile;
}
