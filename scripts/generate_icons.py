"""Generate Echo app icons - sound wave design in multiple sizes."""

from PIL import Image, ImageDraw
import math, os

ICON_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src-tauri", "icons")

# Colors
BG_START = (15, 23, 42)    # dark blue
BG_END = (30, 27, 75)      # dark purple
WAVE_COLOR = (56, 189, 248) # sky blue
WAVE_ALPHA = 220

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = size // 2
    r = size // 2 - max(2, size // 32)

    # Draw gradient circle background
    for y in range(size):
        t = y / size
        r_bg = int(BG_START[0] + (BG_END[0] - BG_START[0]) * t)
        g_bg = int(BG_START[1] + (BG_END[1] - BG_START[1]) * t)
        b_bg = int(BG_START[2] + (BG_END[2] - BG_START[2]) * t)
        for x in range(size):
            dx, dy = x - cx, y - cy
            if dx*dx + dy*dy <= r*r:
                img.putpixel((x, y), (r_bg, g_bg, b_bg, 255))

    # Draw sound waves (4 arcs on each side)
    wave_r = r * 0.28
    wave_count = 4
    wave_width = max(2, size // 48)

    for i in range(wave_count):
        wr = wave_r + (r * 0.16 * (i + 1))
        n_segments = 48
        
        # Right arcs: -60 to 60 degrees
        start_deg = -60
        end_deg = 60
        for seg in range(n_segments):
            a1 = math.radians(start_deg + (end_deg - start_deg) * seg / n_segments)
            a2 = math.radians(start_deg + (end_deg - start_deg) * (seg + 1) / n_segments)
            x1 = cx + wr * math.cos(a1)
            y1 = cy + wr * math.sin(a1)
            x2 = cx + wr * math.cos(a2)
            y2 = cy + wr * math.sin(a2)
            draw.line([(x1, y1), (x2, y2)], fill=(*WAVE_COLOR, WAVE_ALPHA), width=wave_width)

        # Left arcs: 120 to 240 degrees
        start_deg = 120
        end_deg = 240
        for seg in range(n_segments):
            a1 = math.radians(start_deg + (end_deg - start_deg) * seg / n_segments)
            a2 = math.radians(start_deg + (end_deg - start_deg) * (seg + 1) / n_segments)
            x1 = cx + wr * math.cos(a1)
            y1 = cy + wr * math.sin(a1)
            x2 = cx + wr * math.cos(a2)
            y2 = cy + wr * math.sin(a2)
            draw.line([(x1, y1), (x2, y2)], fill=(*WAVE_COLOR, WAVE_ALPHA), width=wave_width)

    # Center dot
    dot_r = max(2, size // 40)
    draw.ellipse([cx-dot_r, cy-dot_r, cx+dot_r, cy+dot_r],
                 fill=(*WAVE_COLOR, 255), outline=None)

    return img

def main():
    os.makedirs(ICON_DIR, exist_ok=True)

    # Standard icon sizes
    sizes = {
        "32x32.png": 32,
        "64x64.png": 64,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
        "logo.png": 1024,
    }

    for name, s in sizes.items():
        img = make_icon(s)
        path = os.path.join(ICON_DIR, name)
        img.save(path, "PNG")
        print(f"  [OK] {name} ({s}x{s})")

    # ICO (Windows multi-resolution)
    ico_sizes = [32, 64, 128, 256]
    ico_path = os.path.join(ICON_DIR, "icon.ico")
    imgs = [make_icon(s).convert("RGBA") for s in ico_sizes]
    imgs[0].save(ico_path, format="ICO",
                 sizes=[(s, s) for s in ico_sizes],
                 append_images=imgs[1:])
    print(f"  [OK] icon.ico ({', '.join(str(s) for s in ico_sizes)}px)")

    # ICNS (macOS placeholder - PNG format)
    icns_path = os.path.join(ICON_DIR, "icon.icns")
    make_icon(512).save(icns_path, format="PNG")
    print(f"  [OK] icon.icns (512px PNG placeholder)")

    # Windows Store icons
    store_sizes = {
        "Square30x30Logo.png": 30,
        "Square44x44Logo.png": 44,
        "Square71x71Logo.png": 71,
        "Square89x89Logo.png": 89,
        "Square107x107Logo.png": 107,
        "Square142x142Logo.png": 142,
        "Square150x150Logo.png": 150,
        "Square284x284Logo.png": 284,
        "Square310x310Logo.png": 310,
        "StoreLogo.png": 50,
    }
    for name, s in store_sizes.items():
        make_icon(s).save(os.path.join(ICON_DIR, name), "PNG")
        print(f"  [OK] {name} ({s}x{s})")

    print(f"\nAll icons generated in: {ICON_DIR}")

if __name__ == "__main__":
    main()
