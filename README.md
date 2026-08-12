# Emma · 哆啦美 — Family Album

A static family photo album website. Warm storybook design: full-screen
hero slideshow, chronological chapters of Emma's first year, justified
photo galleries with a fullscreen lightbox.

- `index.html` — landing page (hero, stats, chapter timeline)
- `chapter.html?c=<slug>` — one gallery per chapter
- `data/manifest.json` — chapter metadata + photo dimensions (generated)
- `img/<slug>/t/*.webp` — 520px thumbnails (generated)
- `img/<slug>/l/*.webp` — 1600px large renditions (generated)

Originals stay offline. Derivatives are WebP, sRGB-converted, EXIF-stripped.

Local preview: `python3 -m http.server` in this folder.
