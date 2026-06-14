from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]

APP_ICON_FILES = {
    "src-tauri/icons/icon.png": 512,
    "src-tauri/icons/logo.png": 512,
    "src-tauri/icons/128x128@2x.png": 256,
    "src-tauri/icons/128x128.png": 128,
    "src-tauri/icons/64x64.png": 64,
    "src-tauri/icons/32x32.png": 32,
    "src-tauri/icons/StoreLogo.png": 50,
    "src-tauri/icons/Square30x30Logo.png": 30,
    "src-tauri/icons/Square44x44Logo.png": 44,
    "src-tauri/icons/Square71x71Logo.png": 71,
    "src-tauri/icons/Square89x89Logo.png": 89,
    "src-tauri/icons/Square107x107Logo.png": 107,
    "src-tauri/icons/Square142x142Logo.png": 142,
    "src-tauri/icons/Square150x150Logo.png": 150,
    "src-tauri/icons/Square284x284Logo.png": 284,
    "src-tauri/icons/Square310x310Logo.png": 310,
    "src-tauri/resources/echo.png": 256,
}


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = clamp(t, 0.0, 1.0)
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def mix3(
    c1: tuple[int, int, int],
    c2: tuple[int, int, int],
    c3: tuple[int, int, int],
    t: float,
) -> tuple[int, int, int]:
    if t <= 0.5:
      return mix(c1, c2, t * 2.0)
    return mix(c2, c3, (t - 0.5) * 2.0)


def arc_points(
    center: tuple[float, float],
    radius: float,
    start_deg: float,
    end_deg: float,
    steps: int = 64,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        angle = math.radians(start_deg + (end_deg - start_deg) * t)
        x = center[0] + radius * math.cos(angle)
        y = center[1] + radius * math.sin(angle)
        points.append((x, y))
    return points


def draw_arc(
    draw: ImageDraw.ImageDraw,
    center: tuple[float, float],
    radius: float,
    start_deg: float,
    end_deg: float,
    color: tuple[int, int, int, int],
    width: float,
    steps: int = 64,
) -> None:
    draw.line(
        arc_points(center, radius, start_deg, end_deg, steps),
        fill=color,
        width=max(1, round(width)),
        joint="curve",
    )


def draw_three_group_arcs(
    draw: ImageDraw.ImageDraw,
    center: tuple[float, float],
    outer_radius: float,
    inner_radius: float,
    outer_width: float,
    inner_width: float,
    outer_color: tuple[int, int, int, int],
    inner_color: tuple[int, int, int, int],
) -> None:
    outer_start, outer_end = 248.0, 292.0
    inner_start, inner_end = 250.0, 290.0
    for rotation in (0.0, 120.0, 240.0):
        draw_arc(
            draw,
            center,
            outer_radius,
            outer_start + rotation,
            outer_end + rotation,
            outer_color,
            outer_width,
        )
        draw_arc(
            draw,
            center,
            inner_radius,
            inner_start + rotation,
            inner_end + rotation,
            inner_color,
            inner_width,
        )


def rounded_mask(size: int, inset: float, radius: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [inset, inset, size - inset, size - inset],
        radius=radius,
        fill=255,
    )
    return mask


def render_app_icon(size: int = 1024) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inset = size * 24 / 512
    radius = size * 116 / 512
    cx = cy = size / 2

    bg_gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_pixels = bg_gradient.load()
    c1 = (18, 26, 46)
    c2 = (6, 10, 18)
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            rgb = mix(c1, c2, t)
            bg_pixels[x, y] = (*rgb, 255)
    bg_mask = rounded_mask(size, inset, radius)
    img.paste(bg_gradient, (0, 0), bg_mask)

    border = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        [inset + 1, inset + 1, size - inset - 1, size - inset - 1],
        radius=radius - 1,
        outline=(255, 255, 255, 20),
        width=max(1, round(size * 2 / 512)),
    )
    img.alpha_composite(border)

    aura = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    aura_pixels = aura.load()
    aura_radius = size * 168 / 512
    c_a = (140, 130, 255)
    c_b = (94, 168, 255)
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy)
            if dist > aura_radius:
                continue
            t = clamp(dist / aura_radius, 0.0, 1.0)
            alpha = round((1.0 - t) ** 1.9 * 46)
            if alpha <= 0:
                continue
            rgb = mix(c_a, c_b, clamp((dx + dy + size) / (2 * size), 0.0, 1.0))
            aura_pixels[x, y] = (*rgb, alpha)
    img.alpha_composite(aura.filter(ImageFilter.GaussianBlur(radius=size * 0.02)))

    ring_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ring_pixels = ring_layer.load()
    outer_r = size * 118 / 512
    outer_w = size * 28 / 512
    ring_inner = outer_r - outer_w / 2
    ring_outer = outer_r + outer_w / 2
    ring_c1 = (138, 213, 255)
    ring_c2 = (146, 132, 255)
    ring_c3 = (95, 110, 255)
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy)
            if dist < ring_inner or dist > ring_outer:
                continue
            edge = min(dist - ring_inner, ring_outer - dist)
            aa = clamp(edge / max(1.0, size * 0.01), 0.0, 1.0)
            t = clamp((x + y) / (2 * (size - 1)), 0.0, 1.0)
            rgb = mix3(ring_c1, ring_c2, ring_c3, t)
            ring_pixels[x, y] = (*rgb, round(255 * aa))
    img.alpha_composite(ring_layer)

    draw = ImageDraw.Draw(img)
    inner_ring_r = size * 92 / 512
    draw.ellipse(
        [cx - inner_ring_r, cy - inner_ring_r, cx + inner_ring_r, cy + inner_ring_r],
        outline=(255, 255, 255, 26),
        width=max(1, round(size * 2 / 512)),
    )

    draw_three_group_arcs(
        draw,
        (cx, cy),
        size * 74 / 512,
        size * 46 / 512,
        size * 7 / 512,
        size * 3.5 / 512,
        (238, 245, 255, 235),
        (255, 255, 255, 40),
    )

    core_outer = size * 34 / 512
    core_mid = size * 18 / 512
    core_inner = size * 8 / 512
    draw.ellipse(
        [cx - core_outer, cy - core_outer, cx + core_outer, cy + core_outer],
        fill=(255, 255, 255, 10),
    )
    draw.ellipse(
        [cx - core_mid, cy - core_mid, cx + core_mid, cy + core_mid],
        fill=(243, 246, 255, 255),
    )
    draw.ellipse(
        [cx - core_inner, cy - core_inner, cx + core_inner, cy + core_inner],
        fill=(118, 126, 255, 255),
    )

    return img


def render_tray_mark(
    size: int,
    line_color: tuple[int, int, int, int],
    center_color: tuple[int, int, int, int],
    arc_color: tuple[int, int, int, int],
) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = size / 2
    outer_r = size * 0.28
    outer_w = max(2, round(size * 0.09))
    draw.ellipse(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
        outline=line_color,
        width=outer_w,
    )
    draw_three_group_arcs(
        draw,
        (cx, cy),
        size * 0.175,
        size * 0.109,
        max(2, round(size * 0.022)),
        max(1, round(size * 0.011)),
        arc_color,
        (*line_color[:3], round(line_color[3] * 0.28)),
    )
    core_mid = size * 0.076
    core_inner = size * 0.034
    draw.ellipse(
        [cx - core_mid, cy - core_mid, cx + core_mid, cy + core_mid],
        fill=line_color,
    )
    draw.ellipse(
        [cx - core_inner, cy - core_inner, cx + core_inner, cy + core_inner],
        fill=center_color,
    )
    return img


def save_resized(image: Image.Image, output_path: Path, size: int) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(output_path)


def main() -> None:
    master_icon = render_app_icon(1024)
    for relative_path, size in APP_ICON_FILES.items():
        save_resized(master_icon, ROOT / relative_path, size)

    icon_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_image = master_icon.resize((256, 256), Image.Resampling.LANCZOS)
    ico_image.save(ROOT / "src-tauri/icons/icon.ico", sizes=icon_sizes)
    try:
        icns_image = master_icon.resize((1024, 1024), Image.Resampling.LANCZOS)
        icns_image.save(ROOT / "src-tauri/icons/icon.icns")
    except OSError:
        pass

    white = (255, 255, 255, 255)
    black = (22, 26, 34, 255)
    purple = (146, 132, 255, 255)
    red = (255, 117, 145, 255)
    cyan = (110, 221, 255, 255)

    tray_specs = {
        "src-tauri/resources/tray_idle.png": (white, white, white),
        "src-tauri/resources/tray_idle_dark.png": (black, black, black),
        "src-tauri/resources/tray_recording.png": (white, red, white),
        "src-tauri/resources/tray_recording_dark.png": (black, red, black),
        "src-tauri/resources/tray_transcribing.png": (white, cyan, white),
        "src-tauri/resources/tray_transcribing_dark.png": (black, cyan, black),
        "src-tauri/resources/recording.png": (purple, red, (224, 217, 255, 255)),
        "src-tauri/resources/transcribing.png": (purple, cyan, (224, 217, 255, 255)),
    }

    for relative_path, (line_color, center_color, arc_color) in tray_specs.items():
        tray_icon = render_tray_mark(256, line_color, center_color, arc_color)
        output_path = ROOT / relative_path
        save_resized(tray_icon, output_path, 64)


if __name__ == "__main__":
    main()
