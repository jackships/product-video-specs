# product-video-specs

Upload limits for product videos on the channels a small store usually posts to, as plain JSON, plus a tiny dependency-free checker (JavaScript, ESM, with TypeScript types).

| Channel | Containers | Aspect ratio | Max length | Max file size | Other hard limits |
|---|---|---|---|---|---|
| [Shopify product media](https://help.shopify.com/en/manual/products/product-media/product-media-types) | .mp4 .mov .webm | any | 10 min | 1 GB | up to 4K (4096 x 2160) |
| [YouTube Shorts](https://support.google.com/youtube/answer/12779649) | (YouTube's usual formats) | square or vertical | 3 min | (not stated for Shorts) | |
| [TikTok In-Feed Ads](https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads) (non-Spark) | .mp4 .mov .mpeg .3gp .avi | 9:16 (recommended), 16:9, 1:1 | 10 min | 500 MB | min 540x960 / 960x540 / 640x640; bitrate ≥ 516 kbps |
| [Instagram Reels ads](https://www.facebook.com/business/ads-guide/update/video/instagram-reels) | .mp4 .mov | 9:16 recommended | 15 min | 4 GB | min width 250 px (< 30 s) or 500 px (≥ 30 s) |
| [Amazon listing video](https://sell.amazon.com/blog/amazon-product-video) | .mp4 .mov | (verify in Seller Central) | (verify in Seller Central) | 5 GB | up to 1080p recommended |

Instagram Reels ads also recommend 1440 x 2560, H.264, stereo AAC at 128 kbps or more, and a safe zone: keep text and logos out of the top 14%, the bottom 35% and 6% on each side.

**Verify with the platform.** Every number was copied from the linked page on 2026-10-07. Platforms change these without notice. Where a page does not state a limit, the dataset has `null` and the checker reports "not checked" instead of guessing. Organic TikTok and organic Instagram uploads are left out on purpose: their limits change often and are not published in one stable place.

## Install

Not published to npm. Clone it, or copy `src/` (or just `data/specs.json`) into your project:

```sh
git clone https://github.com/jackships/product-video-specs.git
cd product-video-specs
npm test
node examples/check.js my-video.mp4            # needs ffprobe (ffmpeg) on PATH
```

```
my-video.mp4: 1920x1080, 3.0s, 2.2 MB, mp4/h264, no audio

OK    shopify-product-media
FAIL  youtube-shorts
      error: 1920x1080 is landscape. This channel needs square or vertical video.
OK    tiktok-in-feed-ads
      warning: 16:9: 9:16 is recommended.
OK    instagram-reels-ads
      warning: 16:9: 9:16 is recommended.
      warning: 1920x1080 is below the recommended 1440x2560.
      warning: No audio track. Sound is strongly recommended on this channel.
OK    amazon-listing-video
```

## Usage

```js
import { checkVideo, checkAllChannels, fromFfprobe, safeZoneRect, aspectLabel } from "./src/index.js";

checkVideo(
  { container: "mp4", width: 1080, height: 1920, durationSec: 200, bytes: 40e6 },
  "youtube-shorts",
);
// { channel: "youtube-shorts", ok: false,
//   issues: [{ level: "error", code: "too_long", message: "3m20s is longer than the 3m00s limit." }] }

checkAllChannels(meta);                  // one result per channel
safeZoneRect("instagram-reels-ads", 1080, 1920);
// { x: 65, y: 269, width: 950, height: 979 }  -> keep captions inside this box
aspectLabel(480, 848);                   // "9:16" (1% tolerance for encoder rounding)
```

From a real file, run `ffprobe -v error -print_format json -show_format -show_streams file.mp4` and pass the parsed JSON to `fromFfprobe(json, { filename })`. It handles phone clips stored sideways with a rotation flag, skips cover-art streams, and tells .mov from .mp4 by the file brand.

### What `meta` can contain

`container`, `width`, `height` (displayed size), `durationSec`, `bytes`, `bitrateKbps`, `videoCodec`, `audioCodec` (`null` = no audio track), `audioChannels`, `audioBitrateKbps`. Everything is optional; missing fields produce `info` / `not_checked` issues.

### Levels

- `error`: breaks a published hard limit; the upload will likely be rejected.
- `warning`: allowed, but not what the platform recommends (aspect, resolution, codec, audio), or above Amazon's "up to 1080p".
- `info`: the check needed a value you did not provide.

## The data

[`data/specs.json`](data/specs.json) is generated from [`src/specs.js`](src/specs.js) (`npm run build:json`; a test fails if they drift). Each channel has its `source` URL, the `checked` date, and `notes` with the caveats that do not fit a number. Byte limits use decimal units (1 GB = 10^9 bytes), which errs on the safe side.

Found a limit that changed? Open an issue or PR with the link to the platform's page.

## License

[MIT](LICENSE) © 2026 Jack Ships

---

Made by Jack, who also builds [Folra](https://folra.video), a Shopify app that turns confirmed product facts into short product videos.
