#!/usr/bin/env python3
"""
Generate Android notification icon: white silhouette on transparent background.

Android requires notification icons to be:
- White silhouette (alpha channel only; RGB is ignored/tinted by system)
- Transparent background
- Recommended 96x96 or larger; system down-samples

Source: assets/adaptive-icon.png (mascot-on-dark-background, 1024x1024).
Approach: extract the mascot silhouette by treating any pixel meaningfully
different from the dark background (#01030e-ish) as "mascot", then output
a white silhouette with transparent bg at 96x96.

We use a luminance-based mask because the mascot has distinct orange +
warm colors against a very-dark background — luminance thresholding gives
a clean silhouette without needing to hand-tune per-channel deltas.
"""
from PIL import Image
import sys

SRC = "assets/adaptive-icon.png"
DST = "assets/notification-icon.png"
SIZE = 96
# Luminance threshold: anything darker than this counts as background.
# Background is ~#01030e (luminance ~5). Mascot outline is white/near-white
# (luminance ~255), fill is orange (luminance ~140) and black-with-outline.
# We want the mascot's outline + all interior pixels to be selected as
# "foreground" (white in notification icon). Threshold at 15 catches
# even the darkest interior mascot pixels while excluding the true bg.
LUMINANCE_THRESHOLD = 15

src = Image.open(SRC).convert("RGBA")
w, h = src.size
print(f"Source: {SRC} {w}x{h} mode={src.mode}")

# Build mask: for each pixel, foreground if luminance > threshold.
# Standard Rec. 709 luminance: 0.2126*R + 0.7152*G + 0.0722*B.
pixels = src.load()
mask = Image.new("L", (w, h), 0)
mask_pixels = mask.load()
fg_count = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        if lum > LUMINANCE_THRESHOLD:
            mask_pixels[x, y] = 255
            fg_count += 1

print(f"Foreground pixels: {fg_count}/{w*h} ({100*fg_count/(w*h):.1f}%)")

# Build white silhouette: RGB = white, alpha = mask.
white_silhouette = Image.new("RGBA", (w, h), (255, 255, 255, 0))
white_silhouette.putalpha(mask)
# All non-transparent pixels get pure white RGB.
sil_pixels = white_silhouette.load()
for y in range(h):
    for x in range(w):
        if mask_pixels[x, y] > 0:
            sil_pixels[x, y] = (255, 255, 255, mask_pixels[x, y])

# Downsample to 96x96 using LANCZOS for cleanest silhouette.
resized = white_silhouette.resize((SIZE, SIZE), Image.LANCZOS)
resized.save(DST, "PNG")

print(f"Wrote: {DST} {SIZE}x{SIZE} white-on-transparent silhouette")

# Verify: reload and count non-transparent pixels.
verify = Image.open(DST).convert("RGBA")
vw, vh = verify.size
vp = verify.load()
nonzero = 0
white_only = True
for y in range(vh):
    for x in range(vw):
        r, g, b, a = vp[x, y]
        if a > 0:
            nonzero += 1
            # White = R=G=B=255 (allow some anti-aliasing tolerance).
            if not (r == 255 and g == 255 and b == 255):
                white_only = False
print(f"Verify: {vw}x{vh}, non-transparent pixels: {nonzero}/{vw*vh} ({100*nonzero/(vw*vh):.1f}%), all white: {white_only}")
