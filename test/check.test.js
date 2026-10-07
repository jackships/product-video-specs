import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHANNELS, SPECS, aspectLabel, checkVideo, checkAllChannels, safeZoneRect, fromFfprobe, getChannel } from "../src/index.js";

const codes = (r, level) => r.issues.filter((i) => !level || i.level === level).map((i) => i.code);
const good916 = { container: "mp4", width: 1080, height: 1920, durationSec: 20, bytes: 25e6, videoCodec: "h264", audioCodec: "aac", audioChannels: 2, audioBitrateKbps: 192 };

test("data/specs.json matches src/specs.js", () => {
  const json = JSON.parse(readFileSync(new URL("../data/specs.json", import.meta.url), "utf8"));
  assert.deepEqual(json, SPECS);
});

test("every channel cites an https source and a check date", () => {
  for (const c of SPECS.channels) {
    assert.match(c.source, /^https:\/\//, c.id);
    assert.match(c.checked, /^\d{4}-\d{2}-\d{2}$/, c.id);
    assert.ok(Array.isArray(c.notes) && c.notes.length, c.id);
  }
  assert.equal(new Set(CHANNELS).size, CHANNELS.length);
});

test("aspectLabel names common ratios with tolerance", () => {
  assert.equal(aspectLabel(1080, 1920), "9:16");
  assert.equal(aspectLabel(480, 848), "9:16");
  assert.equal(aspectLabel(1080, 1350), "4:5");
  assert.equal(aspectLabel(1920, 1080), "16:9");
  assert.equal(aspectLabel(1080, 1080), "1:1");
  assert.equal(aspectLabel(1000, 1300), null);
  assert.equal(aspectLabel(0, 10), null);
});

test("a clean 9:16 clip passes every channel without errors", () => {
  for (const r of checkAllChannels(good916)) assert.equal(r.ok, true, `${r.channel}: ${JSON.stringify(r.issues)}`);
});

test("Shopify: duration, size, container, 4K ceiling", () => {
  const r = checkVideo({ ...good916, container: "avi", durationSec: 601, bytes: 1.2e9, width: 4320, height: 7680 }, "shopify-product-media");
  assert.deepEqual(codes(r, "error").sort(), ["too_big_frame", "too_large", "too_long", "unsupported_container"]);
  assert.equal(checkVideo({ ...good916, container: ".MOV" }, "shopify-product-media").ok, true);
  assert.equal(checkVideo({ ...good916, container: "video/quicktime" }, "shopify-product-media").ok, true);
  assert.equal(checkVideo({ ...good916, width: 3840, height: 2160 }, "shopify-product-media").ok, true);
});

test("YouTube Shorts: 3 minute cap, landscape rejected, square allowed", () => {
  assert.deepEqual(codes(checkVideo({ ...good916, durationSec: 181 }, "youtube-shorts"), "error"), ["too_long"]);
  assert.deepEqual(codes(checkVideo({ ...good916, width: 1920, height: 1080 }, "youtube-shorts")), ["not_vertical"]);
  const sq = checkVideo({ ...good916, width: 1080, height: 1080 }, "youtube-shorts");
  assert.equal(sq.ok, true);
  assert.deepEqual(codes(sq, "warning"), ["aspect_not_recommended"]);
});

test("TikTok In-Feed: aspect list, per-aspect minimum, bitrate, 500 MB", () => {
  const id = "tiktok-in-feed-ads";
  assert.deepEqual(codes(checkVideo({ ...good916, width: 1080, height: 1350 }, id), "error"), ["aspect_not_allowed"]);
  assert.deepEqual(codes(checkVideo({ ...good916, width: 360, height: 640 }, id), "error"), ["too_small"]);
  assert.equal(checkVideo({ ...good916, width: 640, height: 640 }, id).ok, true);
  assert.deepEqual(codes(checkVideo({ ...good916, width: 600, height: 600 }, id), "error"), ["too_small"]);
  // 1 MB over 20 s = 400 kbps, under the 516 kbps floor
  assert.deepEqual(codes(checkVideo({ ...good916, bytes: 1e6 }, id), "error"), ["low_bitrate"]);
  assert.deepEqual(codes(checkVideo({ ...good916, bytes: 501e6 }, id), "error"), ["too_large"]);
  assert.equal(checkVideo({ ...good916, container: "3gp" }, id).ok, true);
});

test("Instagram Reels ads: width floor depends on duration, recommendations are warnings", () => {
  const id = "instagram-reels-ads";
  assert.equal(checkVideo({ ...good916, width: 300, height: 533, durationSec: 20 }, id).ok, true);
  assert.deepEqual(codes(checkVideo({ ...good916, width: 300, height: 533, durationSec: 45 }, id), "error"), ["too_small"]);
  assert.deepEqual(codes(checkVideo({ ...good916, width: 240, height: 426, durationSec: 10 }, id), "error"), ["too_small"]);
  const r = checkVideo({ ...good916, width: 1920, height: 1080, videoCodec: "hevc", audioCodec: null }, id);
  assert.equal(r.ok, true);
  assert.deepEqual(codes(r, "warning").sort(), ["aspect_not_recommended", "below_recommended_resolution", "codec_not_recommended", "no_audio"]);
  const mono = checkVideo({ ...good916, audioChannels: 1, audioBitrateKbps: 96 }, id);
  assert.deepEqual(codes(mono, "warning").sort(), ["audio_low_bitrate", "audio_mono", "below_recommended_resolution"]);
  assert.deepEqual(codes(checkVideo({ ...good916, durationSec: 901 }, id), "error"), ["too_long"]);
});

test("Amazon: above 1080p is a warning, not an error", () => {
  const r = checkVideo({ ...good916, width: 2160, height: 3840 }, "amazon-listing-video");
  assert.equal(r.ok, true);
  assert.deepEqual(codes(r, "warning"), ["too_big_frame"]);
  assert.deepEqual(codes(checkVideo({ ...good916, bytes: 5.1e9 }, "amazon-listing-video"), "error"), ["too_large"]);
});

test("missing metadata is reported as not_checked, never as a pass", () => {
  const r = checkVideo({}, "tiktok-in-feed-ads");
  assert.equal(r.ok, true);
  assert.ok(codes(r).length >= 4);
  assert.ok(codes(r).every((c) => c === "not_checked"));
});

test("unknown channel throws", () => {
  assert.throws(() => getChannel("myspace"), /Unknown channel/);
});

test("safeZoneRect for Reels ads on 1080x1920", () => {
  assert.deepEqual(safeZoneRect("instagram-reels-ads", 1080, 1920), { x: 65, y: 269, width: 950, height: 979 });
  assert.equal(safeZoneRect("youtube-shorts", 1080, 1920), null);
});

test("fromFfprobe reads sizes, rotation and the container brand", () => {
  const probe = {
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] },
      { codec_type: "audio", codec_name: "aac", channels: 2, bit_rate: "128000" },
      { codec_type: "video", codec_name: "mjpeg", width: 300, height: 300, disposition: { attached_pic: 1 } },
    ],
    format: { format_name: "mov,mp4,m4a,3gp,3g2,mj2", duration: "12.500000", size: "8000000", bit_rate: "5120000", tags: { major_brand: "qt  " } },
  };
  const m = fromFfprobe(probe);
  assert.deepEqual(m, { container: "mov", width: 1080, height: 1920, durationSec: 12.5, bytes: 8e6, bitrateKbps: 5120, videoCodec: "h264", audioCodec: "aac", audioChannels: 2, audioBitrateKbps: 128 });
  assert.equal(fromFfprobe({ ...probe, format: { ...probe.format, tags: { major_brand: "isom" } } }).container, "mp4");
  assert.equal(fromFfprobe(probe, { filename: "clip.MP4" }).container, "mp4");
  assert.equal(fromFfprobe({ streams: [{ codec_type: "video", codec_name: "vp9", width: 720, height: 1280 }], format: { format_name: "matroska,webm" } }).audioCodec, null);
});
