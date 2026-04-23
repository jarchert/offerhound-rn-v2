"""Generate on-brand icon/splash assets for the RN app from Lovable sources.

Inputs:
    - /home/ubuntu/.openclaw/workspace/offerhound-repo/src/assets/offerhound-logo.png (1248x832)
    - /home/ubuntu/.openclaw/workspace/offerhound-repo/src/assets/offerhound-logo-full.png (1536x1024)

Outputs (to offerhound-v2/app/assets/):
    - icon.png                (1024x1024, no alpha, for App Store)
    - adaptive-icon.png       (1024x1024 foreground with transparent padding)
    - splash.png              (2732x2732, logo centered on brand dark bg)
    - notification-icon.png   (96x96 monochrome white)
    - favicon.png             (48x48)
    - logo-wordmark.png       (600x200, transparent, for in-app)
    - logo-mark.png           (512x512, transparent, for in-app compact use)

Brand colors:
    - Dark background: #101318
    - Gold: #e7af08
"""
from PIL import Image, ImageDraw, ImageFilter
import os

ROOT_IN = '/home/ubuntu/.openclaw/workspace/offerhound-repo'
ROOT_OUT = '/home/ubuntu/.openclaw/workspace/offerhound-v2/app/assets'
BG_DARK = (16, 19, 24)   # #101318
BG_DARKER = (10, 11, 15) # #0a0b0f
GOLD = (231, 175, 8)     # #e7af08

os.makedirs(ROOT_OUT, exist_ok=True)

def load_rgb(path):
    return Image.open(path).convert('RGB')

def load_rgba(path):
    return Image.open(path).convert('RGBA')

# Removes near-white backgrounds and replaces with transparency.
# The Lovable logo has a white-ish cream background; we need alpha for layering.
def make_transparent(img, thresh=235):
    img = img.convert('RGBA')
    data = img.getdata()
    new = []
    for px in data:
        r, g, b, a = px
        # Near-white → transparent
        if r > thresh and g > thresh and b > thresh:
            new.append((r, g, b, 0))
        else:
            new.append(px)
    img.putdata(new)
    return img

# 1. App Store icon — 1024x1024 square, no alpha, on brand dark bg.
def make_icon():
    logo = load_rgba(os.path.join(ROOT_IN, 'src/assets/offerhound-logo-full.png'))
    logo = make_transparent(logo)
    # Scale logo to 70% of canvas width
    canvas = Image.new('RGB', (1024, 1024), BG_DARK)
    target_w = int(1024 * 0.72)
    ratio = target_w / logo.width
    target_h = int(logo.height * ratio)
    logo_small = logo.resize((target_w, target_h), Image.LANCZOS)
    # Center
    x = (1024 - target_w) // 2
    y = (1024 - target_h) // 2
    canvas.paste(logo_small, (x, y), logo_small)
    canvas.save(os.path.join(ROOT_OUT, 'icon.png'), 'PNG')
    print('✓ icon.png (1024x1024)')

# 2. Adaptive icon foreground — 1024x1024 with transparent padding for Android safe area.
def make_adaptive_icon():
    logo = load_rgba(os.path.join(ROOT_IN, 'src/assets/offerhound-logo-full.png'))
    logo = make_transparent(logo)
    canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    # Android adaptive icon safe-zone ~66% of canvas
    target_w = int(1024 * 0.55)
    ratio = target_w / logo.width
    target_h = int(logo.height * ratio)
    logo_small = logo.resize((target_w, target_h), Image.LANCZOS)
    x = (1024 - target_w) // 2
    y = (1024 - target_h) // 2
    canvas.paste(logo_small, (x, y), logo_small)
    canvas.save(os.path.join(ROOT_OUT, 'adaptive-icon.png'), 'PNG')
    print('✓ adaptive-icon.png (1024x1024 with alpha, 55% safe)')

# 3. Splash — 2732x2732 (Expo handles rescale), logo centered on dark gradient.
def make_splash():
    SIZE = 2732
    # Vertical dark gradient: #101318 → #0a0b0f
    canvas = Image.new('RGB', (SIZE, SIZE), BG_DARK)
    draw = ImageDraw.Draw(canvas)
    for y in range(SIZE):
        t = y / SIZE
        r = int(BG_DARK[0] * (1 - t) + BG_DARKER[0] * t)
        g = int(BG_DARK[1] * (1 - t) + BG_DARKER[1] * t)
        b = int(BG_DARK[2] * (1 - t) + BG_DARKER[2] * t)
        draw.line([(0, y), (SIZE, y)], fill=(r, g, b))
    logo = load_rgba(os.path.join(ROOT_IN, 'src/assets/offerhound-logo-full.png'))
    logo = make_transparent(logo)
    target_w = int(SIZE * 0.45)
    ratio = target_w / logo.width
    target_h = int(logo.height * ratio)
    logo_small = logo.resize((target_w, target_h), Image.LANCZOS)
    x = (SIZE - target_w) // 2
    y = (SIZE - target_h) // 2
    canvas.paste(logo_small, (x, y), logo_small)
    canvas.save(os.path.join(ROOT_OUT, 'splash.png'), 'PNG')
    print('✓ splash.png (2732x2732)')

# 4. Notification icon — 96x96 monochrome white (Android requirement).
def make_notification_icon():
    logo = load_rgba(os.path.join(ROOT_IN, 'src/assets/offerhound-logo.png'))
    logo = make_transparent(logo)
    # Convert non-transparent pixels to white
    data = logo.getdata()
    new = []
    for px in data:
        r, g, b, a = px
        if a > 128:
            # Only keep dark pixels as white (strip the gold accents)
            brightness = (r + g + b) / 3
            if brightness < 128:
                new.append((255, 255, 255, 255))
            else:
                new.append((255, 255, 255, 200))
        else:
            new.append((0, 0, 0, 0))
    logo.putdata(new)
    logo_small = logo.resize((96, 96), Image.LANCZOS)
    logo_small.save(os.path.join(ROOT_OUT, 'notification-icon.png'), 'PNG')
    print('✓ notification-icon.png (96x96 monochrome)')

# 5. Favicon — 48x48 for Expo web.
def make_favicon():
    logo = load_rgba(os.path.join(ROOT_IN, 'src/assets/offerhound-logo.png'))
    logo = make_transparent(logo)
    canvas = Image.new('RGBA', (48, 48), BG_DARK + (255,))
    target = logo.resize((40, 40), Image.LANCZOS)
    canvas.paste(target, (4, 4), target)
    canvas.save(os.path.join(ROOT_OUT, 'favicon.png'), 'PNG')
    print('✓ favicon.png (48x48)')

# 6. In-app wordmark — 600x200 transparent for navbar/splash-like headers.
def make_wordmark():
    logo = load_rgba(os.path.join(ROOT_IN, 'src/assets/offerhound-logo-full.png'))
    logo = make_transparent(logo)
    # Scale to 600 wide maintaining aspect
    ratio = 600 / logo.width
    target_h = int(logo.height * ratio)
    wordmark = logo.resize((600, target_h), Image.LANCZOS)
    # Pad/crop to 600x200
    canvas = Image.new('RGBA', (600, 200), (0, 0, 0, 0))
    y = (200 - target_h) // 2
    canvas.paste(wordmark, (0, y), wordmark)
    canvas.save(os.path.join(ROOT_OUT, 'logo-wordmark.png'), 'PNG')
    print(f'✓ logo-wordmark.png (600x200 transparent)')

# 7. In-app compact mark — 512x512 transparent (tab bars, avatars).
def make_mark():
    logo = load_rgba(os.path.join(ROOT_IN, 'src/assets/offerhound-logo.png'))
    logo = make_transparent(logo)
    target = logo.resize((512, 512), Image.LANCZOS)
    target.save(os.path.join(ROOT_OUT, 'logo-mark.png'), 'PNG')
    print('✓ logo-mark.png (512x512 transparent)')

if __name__ == '__main__':
    make_icon()
    make_adaptive_icon()
    make_splash()
    make_notification_icon()
    make_favicon()
    make_wordmark()
    make_mark()
    print('\nAll assets written to', ROOT_OUT)
