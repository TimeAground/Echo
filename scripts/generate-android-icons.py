"""Generate Android/iOS icons from the main icon generator."""

import sys, os

# Add scripts dir to path so we can import
sys.path.insert(0, os.path.dirname(__file__))

from generate_icons import make_icon

ANDROID_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src-tauri", "icons", "android")
IOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src-tauri", "icons", "ios")

# Android icons
android_icons = [
    ("mipmap-hdpi/ic_launcher.png", 48),
    ("mipmap-mdpi/ic_launcher.png", 36),
    ("mipmap-xhdpi/ic_launcher.png", 72),
    ("mipmap-xxhdpi/ic_launcher.png", 96),
    ("mipmap-xxxhdpi/ic_launcher.png", 144),
    ("mipmap-hdpi/ic_launcher_round.png", 48),
    ("mipmap-mdpi/ic_launcher_round.png", 36),
    ("mipmap-xhdpi/ic_launcher_round.png", 72),
    ("mipmap-xxhdpi/ic_launcher_round.png", 96),
    ("mipmap-xxxhdpi/ic_launcher_round.png", 144),
    ("mipmap-hdpi/ic_launcher_foreground.png", 108),
    ("mipmap-mdpi/ic_launcher_foreground.png", 72),
    ("mipmap-xhdpi/ic_launcher_foreground.png", 162),
    ("mipmap-xxhdpi/ic_launcher_foreground.png", 216),
    ("mipmap-xxxhdpi/ic_launcher_foreground.png", 324),
]

for rel, s in android_icons:
    path = os.path.join(ANDROID_DIR, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    make_icon(s).save(path, "PNG")
    print(f"  [OK] android/{rel} ({s}x{s})")

# iOS icons
ios_icons = [
    ("AppIcon-20x20@1x.png", 20),
    ("AppIcon-20x20@2x.png", 40),
    ("AppIcon-20x20@2x-1.png", 40),
    ("AppIcon-20x20@3x.png", 60),
    ("AppIcon-29x29@1x.png", 29),
    ("AppIcon-29x29@2x.png", 58),
    ("AppIcon-29x29@2x-1.png", 58),
    ("AppIcon-29x29@3x.png", 87),
    ("AppIcon-40x40@1x.png", 40),
    ("AppIcon-40x40@2x.png", 80),
    ("AppIcon-40x40@2x-1.png", 80),
    ("AppIcon-40x40@3x.png", 120),
    ("AppIcon-60x60@2x.png", 120),
    ("AppIcon-60x60@3x.png", 180),
    ("AppIcon-76x76@1x.png", 76),
    ("AppIcon-76x76@2x.png", 152),
    ("AppIcon-83.5x83.5@2x.png", 167),
    ("AppIcon-512@2x.png", 1024),
]

for rel, s in ios_icons:
    path = os.path.join(IOS_DIR, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    make_icon(s).save(path, "PNG")
    print(f"  [OK] ios/{rel} ({s}x{s})")

print("\nAll mobile icons generated.")
