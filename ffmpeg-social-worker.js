/* Social video conversion worker.
   Loads the pinned FFmpeg.wasm worker runtime on demand.
   The 31 MB core is fetched only after someone chooses to convert a video. */
import "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/worker.js";
