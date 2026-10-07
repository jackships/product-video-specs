export type Level = "error" | "warning" | "info";

export interface Issue {
  level: Level;
  code: string;
  message: string;
}

export interface CheckResult {
  channel: string;
  /** false only when at least one issue has level "error" */
  ok: boolean;
  issues: Issue[];
}

export interface VideoMeta {
  /** "mp4", "mov", "webm", ".MOV", "video/quicktime" ... */
  container?: string | null;
  /** displayed width in px (after rotation) */
  width?: number;
  /** displayed height in px (after rotation) */
  height?: number;
  durationSec?: number;
  bytes?: number;
  /** overall bitrate; computed from bytes and duration when missing */
  bitrateKbps?: number;
  videoCodec?: string | null;
  /** null = no audio track, undefined = unknown */
  audioCodec?: string | null;
  audioChannels?: number;
  audioBitrateKbps?: number;
}

export interface MinDimensionRule {
  aspect: string | null;
  width: number | null;
  height: number | null;
  minDurationSec?: number;
  maxDurationSec?: number;
}

export interface ChannelSpec {
  id: string;
  name: string;
  kind: "store" | "organic" | "ads" | "marketplace";
  source: string;
  checked: string;
  containers: string[] | null;
  aspect: { allowed: "any" | "square-or-vertical" | string[] | null; recommended: string[] };
  minDimensions: MinDimensionRule[];
  maxDimensions: { long: number; short: number; level: "error" | "warning" } | null;
  duration: { minSec: number | null; maxSec: number | null };
  maxBytes: number | null;
  minBitrateKbps: number | null;
  recommended: {
    width: number | null;
    height: number | null;
    videoCodec: string | null;
    audio: { codec: string; channels: number; minBitrateKbps: number } | null;
  };
  safeZone: { topPct: number; bottomPct: number; leftPct: number; rightPct: number } | null;
  notes: string[];
}

export declare const SPECS: { version: string; note: string; channels: ChannelSpec[] };
export declare const CHANNELS: string[];
export declare function getChannel(id: string): ChannelSpec;
export declare function aspectLabel(width: number, height: number, tolerance?: number): string | null;
export declare function checkVideo(meta: VideoMeta, channelId: string): CheckResult;
export declare function checkAllChannels(meta: VideoMeta, ids?: string[]): CheckResult[];
export declare function safeZoneRect(channelId: string, width: number, height: number): { x: number; y: number; width: number; height: number } | null;
export declare function fromFfprobe(probe: unknown, options?: { filename?: string }): VideoMeta;
