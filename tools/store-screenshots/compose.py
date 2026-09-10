#!/usr/bin/env python3
"""Composite raw simulator captures into framed App Store / Play screenshots.

Replaces the hand-built Photoshop files in Documents/graphics/yuzic. The frames
and Inter fonts under assets/ were extracted from those PSDs, so output is
pixel-comparable to what shipped before.

Usage:
    python3 compose.py --device phone --raw raw/phone --out out/phone
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).parent
ASSETS = HERE / "assets"
SPEC = json.loads((HERE / "spec.json").read_text())

HEADLINE_FILL = (0, 0, 0, 255)
SUBLINE_FILL = (60, 60, 60, 255)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ASSETS / name), size)


def draw_multiline(draw, xy, text, font, leading, fill=HEADLINE_FILL):
    """Draw text so the FIRST line's ink lands exactly at xy.

    The PSD stores each text layer's bounding box around the rendered ink, not
    around the font's em box, so anchoring on the baseline (or on 'lt', which
    includes the font's internal leading) drops every caption ~30px low.
    Measuring the first line's own ink offset and subtracting it reproduces the
    original placement.
    """
    x, y = xy
    lines = text.split("\n")
    ink_left, ink_top, _, _ = font.getbbox(lines[0])
    for i, line in enumerate(lines):
        draw.text((x - ink_left, y - ink_top + i * leading), line, font=font, fill=fill)


def build_device(frame: Image.Image, shot: Image.Image, aperture) -> Image.Image:
    """Frame with the screenshot seated behind its glass, as one RGBA layer.

    Kept as a single layer so the caller can place it at a negative offset and
    let PIL clip it against the canvas edge — which is what the 'bottom' and
    'centered' layouts need, since the device runs off the artboard there.
    """
    ax, ay, aw, ah = aperture
    device = Image.new("RGBA", frame.size, (0, 0, 0, 0))

    if shot.size != (aw, ah):
        shot = shot.resize((aw, ah), Image.LANCZOS)

    # Mask the screenshot with the frame's OWN transparency rather than a
    # guessed corner radius. Inside the aperture the frame is transparent
    # exactly where the glass is, so inverting its alpha gives a mask that
    # matches the hole by construction — including the anti-aliased edge.
    #
    # The previous mask was `rounded_rectangle(radius=aw * 0.09)`, a ratio that
    # matched neither frame: the phone's glass corner is ~92px against a
    # computed 81px, and the iPad's is ~30px against a computed 145px. Rounding
    # the screenshot *more* than the hole cuts the corner away from behind the
    # frame and leaves the canvas showing through, which is why the iPad shots
    # had white wedges in every corner and the phone ones — under-rounded, so
    # still covered by the frame — did not.
    glass = frame.split()[3].crop((ax, ay, ax + aw, ay + ah))
    mask = ImageChops.invert(glass)

    device.paste(shot, (ax, ay), mask)
    device.alpha_composite(frame)
    return device


def compose(device_key: str, raw_dir: pathlib.Path, out_dir: pathlib.Path) -> list[pathlib.Path]:
    dev = SPEC["devices"][device_key]
    canvas_w, canvas_h = dev["canvas"]
    frame = Image.open(ASSETS / dev["frame"]).convert("RGBA")
    logo_src = Image.open(ASSETS / "logo.png").convert("RGBA")

    head_font = load_font("Inter-Bold.ttf", dev["headline_size"])
    sub_font = load_font("Inter-Light.ttf", dev["subline_size"])

    out_dir.mkdir(parents=True, exist_ok=True)
    written = []

    for idx, screen in enumerate(SPEC["screens"], start=1):
        raw_path = raw_dir / f"{screen['id']}.png"
        if not raw_path.exists():
            print(f"  ! missing capture {raw_path.name}, skipping", file=sys.stderr)
            continue

        layout_key = screen.get("layout", "top")
        layout = dev["layouts"][layout_key]

        canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 255))

        device = build_device(frame, Image.open(raw_path).convert("RGBA"), dev["aperture"])
        # paste (not alpha_composite) so a negative frame_pos clips instead of
        # raising — the device deliberately runs off-canvas in some layouts.
        canvas.paste(device, tuple(layout["frame_pos"]), device)

        logo = logo_src.resize((layout["logo_size"],) * 2, Image.LANCZOS)
        canvas.paste(logo, tuple(layout["logo_pos"]), logo)

        headline = screen.get(f"headline_{device_key}") or screen.get("headline")
        if headline:
            draw = ImageDraw.Draw(canvas)
            draw_multiline(
                draw,
                layout["headline_pos"],
                headline,
                head_font,
                dev["headline_leading"],
            )
            subline = screen.get(f"subline_{device_key}") or screen.get("subline")
            if subline:
                draw_multiline(
                    draw,
                    layout["subline_pos"],
                    subline,
                    sub_font,
                    dev["subline_leading"],
                    fill=SUBLINE_FILL,
                )

        dest = out_dir / f"{idx}.png"
        final = canvas.convert("RGB")
        # The canvas is the PSD artboard, which is not always a size the store
        # will take: the iPad one is 2064x2752, while App Store Connect only
        # accepts 2048x2732 for a 12.9" iPad and rejects anything else. The two
        # differ by 0.8% at effectively the same aspect ratio (0.7500 vs
        # 0.7496), so a resize at save time is invisible and leaves every
        # PSD-derived layout number in spec.json untouched. Compose at artboard
        # size, export at store size.
        export = dev.get("export")
        if export and tuple(export) != final.size:
            final = final.resize(tuple(export), Image.LANCZOS)
        final.save(dest, "PNG")
        written.append(dest)
        print(f"  wrote {dest}  [{screen['id']}, {layout_key}]")

    return written


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--device", choices=["phone", "ipad"], required=True)
    ap.add_argument("--raw", type=pathlib.Path, required=True)
    ap.add_argument("--out", type=pathlib.Path, required=True)
    args = ap.parse_args()

    written = compose(args.device, args.raw, args.out)
    if not written:
        print("no screenshots composed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
