import { SPECS } from "./specs.js";

export { SPECS };

/** Channel ids in the dataset, e.g. "shopify-product-media". */
export const CHANNELS = SPECS.channels.map((c) => c.id);

/** Look up one channel. Throws on an unknown id so typos fail loudly. */
export function getChannel(id) {
  const c = SPECS.channels.find((ch) => ch.id === id);
  if (!c) throw new Error(`Unknown channel "${id}". Known: ${CHANNELS.join(", ")}`);
  return c;
}

const COMMON_RATIOS = ["9:16", "4:5", "2:3", "3:4", "1:1", "4:3", "3:2", "16:9", "1.91:1", "21:9"];
const ratioValue = (label) => {
  const [a, b] = label.split(":").map(Number);
  return a / b;
};

/**
 * Name the aspect ratio of a frame, e.g. 1080x1920 -> "9:16".
 * Matches common ratios within `tolerance` (relative, default 1%), so 720x1280, 1080x1920 and
 * 540x960 are all "9:16" and an encoder's 480x848 still counts. Returns null otherwise.
 */
export function aspectLabel(width, height, tolerance = 0.01) {
  if (!(width > 0 && height > 0)) return null;
  const r = width / height;
  let best = null;
  let bestErr = Infinity;
  for (const label of COMMON_RATIOS) {
    const err = Math.abs(r / ratioValue(label) - 1);
    if (err < bestErr) {
      best = label;
      bestErr = err;
    }
  }
  return bestErr <= tolerance ? best : null;
}

const CONTAINER_ALIASES = { quicktime: "mov", qt: "mov", m4v: "mp4", mpg: "mpeg", "3gpp": "3gp" };
const normContainer = (c) => {
  if (!c) return null;
  const s = String(c).toLowerCase().replace(/^\./, "").replace(/^video\//, "");
  return CONTAINER_ALIASES[s] ?? s;
};

const CODEC_ALIASES = { avc: "h264", avc1: "h264", "h.264": "h264", h265: "hevc", "h.265": "hevc", hvc1: "hevc" };
const normCodec = (c) => (c ? CODEC_ALIASES[String(c).toLowerCase()] ?? String(c).toLowerCase() : null);

const fmtBytes = (n) => (n >= 1e9 ? `${+(n / 1e9).toFixed(2)} GB` : `${+(n / 1e6).toFixed(1)} MB`);
const fmtSec = (s) => (s >= 60 ? `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, "0")}s` : `${+s.toFixed(1)}s`);
const has = (v) => v !== undefined && v !== null && !Number.isNaN(v);

/**
 * Check a video's metadata against one channel's limits.
 *
 * `meta`: { container, width, height, durationSec, bytes, bitrateKbps,
 *           videoCodec, audioCodec, audioChannels, audioBitrateKbps }
 * Width and height are the displayed size (after rotation). Any field may be missing;
 * checks that need it are reported as "info" instead of silently passing.
 *
 * Returns { channel, ok, issues: [{ level: "error"|"warning"|"info", code, message }] }.
 * `ok` is false only when there is at least one error.
 */
export function checkVideo(meta, channelId) {
  const ch = getChannel(channelId);
  const issues = [];
  const add = (level, code, message) => issues.push({ level, code, message });
  const skip = (what) => add("info", "not_checked", `${what} unknown, not checked.`);

  const { width: w, height: h, durationSec: dur, bytes } = meta;
  const dims = has(w) && has(h);
  const label = dims ? aspectLabel(w, h) : null;

  // Container
  if (ch.containers) {
    const c = normContainer(meta.container);
    if (!c) skip("Container");
    else if (!ch.containers.includes(c)) add("error", "unsupported_container", `.${c} is not accepted. Use ${ch.containers.map((x) => "." + x).join(", ")}.`);
  }

  // Duration
  const { minSec, maxSec } = ch.duration;
  if (has(minSec) || has(maxSec)) {
    if (!has(dur)) skip("Duration");
    else if (has(maxSec) && dur > maxSec) add("error", "too_long", `${fmtSec(dur)} is longer than the ${fmtSec(maxSec)} limit.`);
    else if (has(minSec) && dur < minSec) add("error", "too_short", `${fmtSec(dur)} is shorter than the ${fmtSec(minSec)} minimum.`);
  }

  // File size
  if (has(ch.maxBytes)) {
    if (!has(bytes)) skip("File size");
    else if (bytes > ch.maxBytes) add("error", "too_large", `${fmtBytes(bytes)} is over the ${fmtBytes(ch.maxBytes)} limit.`);
  }

  // Aspect ratio
  const { allowed, recommended } = ch.aspect;
  if (allowed !== "any" && (allowed || recommended.length)) {
    if (!dims) skip("Frame size");
    else if (allowed === "square-or-vertical") {
      if (w > h * 1.01) add("error", "not_vertical", `${w}x${h} is landscape. This channel needs square or vertical video.`);
    } else if (Array.isArray(allowed) && !allowed.includes(label)) {
      add("error", "aspect_not_allowed", `${w}x${h} (${label ?? (w / h).toFixed(3) + ":1"}) is not one of ${allowed.join(", ")}.`);
    }
    const aspectError = issues.some((i) => i.code === "not_vertical" || i.code === "aspect_not_allowed");
    if (dims && recommended.length && !recommended.includes(label) && !aspectError) {
      add("warning", "aspect_not_recommended", `${label ?? `${w}x${h}`}: ${recommended.join(" or ")} is recommended.`);
    }
  }

  // Minimum size (some rules apply to one aspect ratio or one duration range only)
  for (const rule of ch.minDimensions) {
    if (rule.aspect && rule.aspect !== label) continue;
    if (has(rule.minDurationSec) || has(rule.maxDurationSec)) {
      if (!has(dur)) continue;
      if (has(rule.minDurationSec) && dur < rule.minDurationSec) continue;
      if (has(rule.maxDurationSec) && dur >= rule.maxDurationSec) continue;
    }
    if (!dims) {
      skip("Frame size");
      break;
    }
    const tooNarrow = has(rule.width) && w < rule.width;
    const tooShort = has(rule.height) && h < rule.height;
    if (tooNarrow || tooShort) {
      const need = [has(rule.width) ? `${rule.width} px wide` : null, has(rule.height) ? `${rule.height} px tall` : null].filter(Boolean).join(" and ");
      add("error", "too_small", `${w}x${h} is too small: needs at least ${need}${rule.aspect ? ` for ${rule.aspect}` : ""}.`);
    }
  }

  // Maximum size
  if (ch.maxDimensions) {
    const { long, short, level } = ch.maxDimensions;
    if (!dims) skip("Frame size");
    else if (Math.max(w, h) > long || Math.min(w, h) > short) {
      add(level, "too_big_frame", `${w}x${h} is above ${long}x${short}${level === "warning" ? " (recommended maximum)" : ""}.`);
    }
  }

  // Bitrate
  if (has(ch.minBitrateKbps)) {
    const kbps = has(meta.bitrateKbps) ? meta.bitrateKbps : has(bytes) && dur > 0 ? (bytes * 8) / dur / 1000 : null;
    if (!has(kbps)) skip("Bitrate");
    else if (kbps < ch.minBitrateKbps) add("error", "low_bitrate", `${Math.round(kbps)} kbps is below the ${ch.minBitrateKbps} kbps minimum.`);
  }

  // Recommendations
  const rec = ch.recommended;
  if (rec.width && rec.height && dims) {
    const recShort = Math.min(rec.width, rec.height);
    if (Math.min(w, h) < recShort) add("warning", "below_recommended_resolution", `${w}x${h} is below the recommended ${rec.width}x${rec.height}.`);
  }
  if (rec.videoCodec) {
    const vc = normCodec(meta.videoCodec);
    if (!vc) skip("Video codec");
    else if (vc !== rec.videoCodec) add("warning", "codec_not_recommended", `Video codec ${vc}; ${rec.videoCodec} is recommended.`);
  }
  if (rec.audio) {
    const ac = normCodec(meta.audioCodec);
    if (meta.audioCodec === undefined) skip("Audio");
    else if (!ac) add("warning", "no_audio", "No audio track. Sound is strongly recommended on this channel.");
    else {
      if (rec.audio.codec && ac !== rec.audio.codec) add("warning", "audio_codec_not_recommended", `Audio codec ${ac}; ${rec.audio.codec} is recommended.`);
      if (rec.audio.channels && has(meta.audioChannels) && meta.audioChannels < rec.audio.channels) add("warning", "audio_mono", `Audio has ${meta.audioChannels} channel; stereo is recommended.`);
      if (rec.audio.minBitrateKbps && has(meta.audioBitrateKbps) && meta.audioBitrateKbps < rec.audio.minBitrateKbps) add("warning", "audio_low_bitrate", `Audio is ${Math.round(meta.audioBitrateKbps)} kbps; ${rec.audio.minBitrateKbps}+ kbps is recommended.`);
    }
  }

  return { channel: ch.id, ok: !issues.some((i) => i.level === "error"), issues };
}

/** Run checkVideo for every channel (or the ids given). */
export function checkAllChannels(meta, ids = CHANNELS) {
  return ids.map((id) => checkVideo(meta, id));
}

/**
 * The area where text and logos are safe from platform UI, in pixels, or null when the
 * channel publishes no single safe zone. { x, y, width, height }
 */
export function safeZoneRect(channelId, width, height) {
  const z = getChannel(channelId).safeZone;
  if (!z) return null;
  const x = Math.round((width * z.leftPct) / 100);
  const y = Math.round((height * z.topPct) / 100);
  return {
    x,
    y,
    width: Math.round((width * (100 - z.leftPct - z.rightPct)) / 100),
    height: Math.round((height * (100 - z.topPct - z.bottomPct)) / 100),
  };
}

/**
 * Turn `ffprobe -v error -print_format json -show_format -show_streams <file>` output into the
 * `meta` object checkVideo expects. Handles phone videos stored sideways with a rotation flag.
 * Pass `filename` to take the container from the extension (more reliable than ffprobe's
 * "mov,mp4,m4a,..." family name).
 */
export function fromFfprobe(probe, { filename } = {}) {
  const streams = probe.streams ?? [];
  const fmt = probe.format ?? {};
  const v = streams.find((s) => s.codec_type === "video" && !(s.disposition && s.disposition.attached_pic));
  const a = streams.find((s) => s.codec_type === "audio");
  const num = (x) => (x === undefined || x === null || x === "N/A" || x === "" ? undefined : Number(x));

  let width = num(v?.width);
  let height = num(v?.height);
  const rot = num(v?.tags?.rotate) ?? num(v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation);
  if (has(rot) && Math.abs(rot) % 180 === 90) [width, height] = [height, width];

  let container;
  const ext = filename && /\.([a-z0-9]+)$/i.exec(filename)?.[1];
  if (ext) container = normContainer(ext);
  else if (fmt.format_name) {
    const names = String(fmt.format_name).split(",");
    if (names.includes("mov")) container = String(fmt.tags?.major_brand ?? "").trim() === "qt" ? "mov" : "mp4";
    else if (names.includes("webm")) container = "webm";
    else container = normContainer(names[0]);
  }

  const bitRate = num(fmt.bit_rate);
  const aBitRate = num(a?.bit_rate);
  return {
    container,
    width,
    height,
    durationSec: num(fmt.duration) ?? num(v?.duration),
    bytes: num(fmt.size),
    bitrateKbps: has(bitRate) ? bitRate / 1000 : undefined,
    videoCodec: v?.codec_name ?? null,
    audioCodec: a?.codec_name ?? null,
    audioChannels: num(a?.channels),
    audioBitrateKbps: has(aBitRate) ? aBitRate / 1000 : undefined,
  };
}
