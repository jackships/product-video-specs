#!/usr/bin/env node
// Usage: node examples/check.js <video-file> [channel-id ...]
// Needs ffprobe (part of ffmpeg) on your PATH.
import { execFileSync } from "node:child_process";
import { CHANNELS, checkAllChannels, fromFfprobe } from "../src/index.js";

const [file, ...ids] = process.argv.slice(2);
if (!file) {
  console.error(`Usage: node examples/check.js <video-file> [channel ...]\nChannels: ${CHANNELS.join(", ")}`);
  process.exit(2);
}

const json = execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { encoding: "utf8" });
const meta = fromFfprobe(JSON.parse(json), { filename: file });
console.log(`${file}: ${meta.width}x${meta.height}, ${meta.durationSec?.toFixed(1)}s, ${((meta.bytes ?? 0) / 1e6).toFixed(1)} MB, ${meta.container}/${meta.videoCodec}${meta.audioCodec ? "+" + meta.audioCodec : ", no audio"}\n`);

let anyError = false;
for (const r of checkAllChannels(meta, ids.length ? ids : CHANNELS)) {
  anyError ||= !r.ok;
  console.log(`${r.ok ? "OK  " : "FAIL"}  ${r.channel}`);
  for (const i of r.issues) if (i.level !== "info") console.log(`      ${i.level}: ${i.message}`);
}
process.exit(anyError ? 1 : 0);
