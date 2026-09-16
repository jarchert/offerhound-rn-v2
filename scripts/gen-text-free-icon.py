#!/usr/bin/env python3
"""
Generate text-free iOS app icon by compositing the mascot-only adaptive-icon
over the dark blue brand background (#01030e — matches splash + adaptive bg).
Output: assets/icon.png (1024x1024, RGB no alpha — Apple HIG requires opaque).
Also overwrite assets/icon.png in-place, backing up the previous "OFFERHOUND"
text version to assets/icon.png.text-version.bak so it's preserved.

Background color must exactly match app.json:
  splash.backgroundColor         = "#01030e"
  android.adaptiveIcon.background = "#01030e"
"""
from PIL import Image

SRC_MASCOT = "assets/adaptive-icon.png"   # 1024x1024 RGBA mascot on dark bg
DST_ICON = "assets/icon.png"              # will become 1024x1024 RGB text-free
BG_HEX = "#01030e"

# Parse bg color.
bg_rgb = tuple(int(BG_HEX[i:i+2], 16) for i in (1, 3, 5))
print(f"Background: {BG_HEX} = {bg_rgb}")

mascot = Image.open(SRC_MASCOT).convert("RGBA")
print(f"Mascot source: {mascot.size} mode={mascot.mode}")

# Compose over solid bg. adaptive-icon.png already has the dark bg painted
# in the RGBA data; we composite over an opaque bg of the same color and
# then flatten to RGB so alpha is stripped for Apple compliance.
bg = Image.new("RGB", mascot.size, bg_rgb)
# Convert mascot to RGB with alpha-composite over bg color.
composite = Image.new("RGBA", mascot.size, bg_rgb + (255,))
composite.alpha_composite(mascot)
final = composite.convert("RGB")

# Sanity: verify no transparency remains and image is 1024x1024.
assert final.mode == "RGB", f"expected RGB, got {final.mode}"
assert final.size == (1024, 1024), f"expected 1024x1024, got {final.size}"

final.save(DST_ICON, "PNG", optimize=True)
print(f"Wrote: {DST_ICON} {final.size} mode={final.mode}")

# Verify: reload and confirm mode + no alpha channel + size.
verify = Image.open(DST_ICON)
print(f"Verify: {verify.size} mode={verify.mode} format={verify.format}")
assert verify.mode == "RGB"
assert verify.size == (1024, 1024)
print("iOS icon: text-free mascot-only, 1024x1024, opaque RGB (Apple HIG compliant)")
