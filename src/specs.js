// Source of truth for data/specs.json (regenerate with `npm run build:json`).
// Every number comes from the page in `source`; null means the page does not say.
export const SPECS = {
  "version": "2026-10-07",
  "note": "Upload limits for product videos, copied from each platform's own public help pages on the date in `checked`. Platforms change these without notice. A null value means the source page does not state it, so this dataset does not guess. Verify with the platform before relying on a number.",
  "channels": [
    {
      "id": "shopify-product-media",
      "name": "Shopify product media (uploaded video)",
      "kind": "store",
      "source": "https://help.shopify.com/en/manual/products/product-media/product-media-types",
      "checked": "2026-10-07",
      "containers": [
        "mp4",
        "mov",
        "webm"
      ],
      "aspect": {
        "allowed": "any",
        "recommended": []
      },
      "minDimensions": [],
      "maxDimensions": {
        "long": 4096,
        "short": 2160,
        "level": "error"
      },
      "duration": {
        "minSec": null,
        "maxSec": 600
      },
      "maxBytes": 1000000000,
      "minBitrateKbps": null,
      "recommended": {
        "width": null,
        "height": null,
        "videoCodec": null,
        "audio": null
      },
      "safeZone": null,
      "notes": [
        "Shopify converts .mov and .webm and serves every video as MP4 or HLS.",
        "Shoppers see 480p, 720p or 1080p depending on their connection, so very high resolutions mostly cost upload time.",
        "YouTube and Vimeo links can be embedded instead and are not subject to these limits.",
        "Your theme must support video media (all Online Store 2.0 themes by Shopify do)."
      ]
    },
    {
      "id": "youtube-shorts",
      "name": "YouTube Shorts",
      "kind": "organic",
      "source": "https://support.google.com/youtube/answer/12779649",
      "checked": "2026-10-07",
      "containers": null,
      "aspect": {
        "allowed": "square-or-vertical",
        "recommended": [
          "9:16"
        ]
      },
      "minDimensions": [],
      "maxDimensions": null,
      "duration": {
        "minSec": null,
        "maxSec": 180
      },
      "maxBytes": null,
      "minBitrateKbps": null,
      "recommended": {
        "width": null,
        "height": null,
        "videoCodec": null,
        "audio": null
      },
      "safeZone": null,
      "notes": [
        "A video counts as a Short when it is up to 3 minutes long and square or vertical.",
        "Recommending 9:16 is this dataset's choice (it fills a phone screen); the help page only says square or vertical.",
        "Regular YouTube upload rules (formats, file size) still apply; they are not repeated here."
      ]
    },
    {
      "id": "tiktok-in-feed-ads",
      "name": "TikTok In-Feed Ads (non-Spark)",
      "kind": "ads",
      "source": "https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads",
      "checked": "2026-10-07",
      "containers": [
        "mp4",
        "mov",
        "mpeg",
        "3gp",
        "avi"
      ],
      "aspect": {
        "allowed": [
          "9:16",
          "16:9",
          "1:1"
        ],
        "recommended": [
          "9:16"
        ]
      },
      "minDimensions": [
        {
          "aspect": "9:16",
          "width": 540,
          "height": 960
        },
        {
          "aspect": "16:9",
          "width": 960,
          "height": 540
        },
        {
          "aspect": "1:1",
          "width": 640,
          "height": 640
        }
      ],
      "maxDimensions": null,
      "duration": {
        "minSec": null,
        "maxSec": 600
      },
      "maxBytes": 500000000,
      "minBitrateKbps": 516,
      "recommended": {
        "width": null,
        "height": null,
        "videoCodec": null,
        "audio": null
      },
      "safeZone": null,
      "notes": [
        "Spark Ads reuse an organic TikTok post (.mp4 or .mov) and have no duration limit.",
        "TikTok publishes its safe zone as downloadable overlay files that depend on caption length and add-ons, so no single percentage is given here.",
        "Organic TikTok uploads have different limits that change often; they are not covered."
      ]
    },
    {
      "id": "instagram-reels-ads",
      "name": "Instagram Reels ads",
      "kind": "ads",
      "source": "https://www.facebook.com/business/ads-guide/update/video/instagram-reels",
      "checked": "2026-10-07",
      "containers": [
        "mp4",
        "mov"
      ],
      "aspect": {
        "allowed": null,
        "recommended": [
          "9:16"
        ]
      },
      "minDimensions": [
        {
          "aspect": null,
          "width": 250,
          "height": null,
          "maxDurationSec": 30
        },
        {
          "aspect": null,
          "width": 500,
          "height": null,
          "minDurationSec": 30
        }
      ],
      "maxDimensions": null,
      "duration": {
        "minSec": 0,
        "maxSec": 900
      },
      "maxBytes": 4000000000,
      "minBitrateKbps": null,
      "recommended": {
        "width": 1440,
        "height": 2560,
        "videoCodec": "h264",
        "audio": {
          "codec": "aac",
          "channels": 2,
          "minBitrateKbps": 128
        }
      },
      "safeZone": {
        "topPct": 14,
        "bottomPct": 35,
        "leftPct": 6,
        "rightPct": 6
      },
      "notes": [
        "Minimum width is 250 px for ads shorter than 30 s and 500 px for 30 s or longer.",
        "Meta recommends progressive scan, square pixels and a fixed frame rate.",
        "Keep text and logos out of the top 14%, bottom 35% and 6% on each side.",
        "Reels ads may not use licensed music; use original or royalty-free audio.",
        "4 GB is read as 4 x 10^9 bytes; leave headroom."
      ]
    },
    {
      "id": "amazon-listing-video",
      "name": "Amazon product listing video",
      "kind": "marketplace",
      "source": "https://sell.amazon.com/blog/amazon-product-video",
      "checked": "2026-10-07",
      "containers": [
        "mp4",
        "mov"
      ],
      "aspect": {
        "allowed": null,
        "recommended": []
      },
      "minDimensions": [],
      "maxDimensions": {
        "long": 1920,
        "short": 1080,
        "level": "warning"
      },
      "duration": {
        "minSec": null,
        "maxSec": null
      },
      "maxBytes": 5000000000,
      "minBitrateKbps": null,
      "recommended": {
        "width": null,
        "height": null,
        "videoCodec": null,
        "audio": null
      },
      "safeZone": null,
      "notes": [
        "Amazon asks for the highest quality available up to 1080p; maxDimensions encodes that as a 1920 x 1080 ceiling (either orientation).",
        "Duration and aspect-ratio rules live in Seller Central help, which requires a login; verify there before uploading.",
        "Amazon also reviews content (no prices, no off-Amazon links, no claims you cannot support)."
      ]
    }
  ]
};

export default SPECS;
