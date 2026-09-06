# Landing page assets

Drop these files in this folder (all the same room, same camera):

| File | What |
|------|------|
| `empty.jpg` | the empty room (first video frame). Only used when no frames exist. |
| `look-1.jpg` | the room furnished — must be identical to the LAST video frame |
| `look-2.jpg` | the same room, second style |
| `look-3.jpg` | the same room, third style |
| `frames/001.webp … NNN.webp` | the video as single frames (see below) |
| `frames.json` | `{ "count": 120, "ext": "webp", "pad": 3 }` |

Without `frames.json` the hero crossfades `empty.jpg → look-1.jpg` instead of scrubbing the video.

## Video → frames

```bash
# 5 s clip at 24 fps = 120 frames, 1600px wide, WebP q80 (~3–4 MB total)
mkdir -p public/landing/frames
ffmpeg -i hero.mp4 -vf "fps=24,scale=1600:-2" -c:v libwebp -quality 80 public/landing/frames/%03d.webp
ls public/landing/frames | wc -l   # → put this number into frames.json
```

Take `look-1.jpg` from the last frame so the video→card transition is seamless:

```bash
ffmpeg -sseof -0.05 -i hero.mp4 -frames:v 1 -q:v 2 public/landing/look-1.jpg
```
