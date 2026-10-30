# Third-party notices

## FFmpeg WebAssembly

Social uses the following pinned FFmpeg WebAssembly components only when a user chooses to upload or locally convert a video:

- `@ffmpeg/ffmpeg` 0.12.15 — wrapper/worker package, MIT-licensed.
- `@ffmpeg/core` 0.12.10 — WebAssembly FFmpeg core, GPL-2.0-or-later.

Upstream source: https://github.com/ffmpegwasm/ffmpeg.wasm

Core package and build information: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/core

GPL-2.0 license text: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html

The core is fetched on demand from jsDelivr and is not copied into this repository. The local `ffmpeg-social-worker.js` file is the small integration entry point that loads the upstream worker runtime. The upstream core includes the H.264 encoder used to create browser-friendly MP4 output; see the upstream build and license information before redistributing or modifying the core.
