import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkVideo, fromFfprobe } from "../src/index.js";

let hasFfmpeg = true;
try {
  execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  hasFfmpeg = false;
}

test("real file through ffprobe (skipped without ffmpeg)", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "pvs-"));
  try {
    const file = join(dir, "clip.mp4");
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=540x960:d=2:r=30", "-f", "lavfi", "-i", "sine=d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", file]);
    const json = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { encoding: "utf8" }));
    const meta = fromFfprobe(json, { filename: file });
    assert.equal(meta.container, "mp4");
    assert.equal(meta.width, 540);
    assert.equal(meta.height, 960);
    assert.ok(Math.abs(meta.durationSec - 2) < 0.2);
    assert.equal(meta.videoCodec, "h264");
    assert.equal(meta.audioCodec, "aac");
    assert.equal(checkVideo(meta, "youtube-shorts").ok, true);
    assert.equal(checkVideo(meta, "shopify-product-media").ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
