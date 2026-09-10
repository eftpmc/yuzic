#!/usr/bin/env python3
"""Copy the generated store screenshots into fastlane's metadata tree.

`deliver` (iOS) and `supply` (Android) each expect their own directory layout
and their own filenames, and neither reads `tools/store-screenshots/out/`. This
is the one step between generating a screenshot and a release actually shipping
it, so it lives with the generator rather than being done by hand.

    python3 publish.py            # both platforms
    python3 publish.py --check    # verify only, write nothing

iOS filenames are ordered by their leading number — deliver sorts
alphabetically and uses that as the listing order, so `1.png` … `5.png` would
be fine, but the device name has to be in the frame folder, not the filename.
Android takes any name and orders by sort, so the same digits work there.
"""
from __future__ import annotations

import argparse
import pathlib
import shutil
import sys

from PIL import Image

HERE = pathlib.Path(__file__).parent
REPO = HERE.parent.parent
OUT = HERE / "out"

# App Store Connect rejects anything that is not one of its exact sizes, so the
# expected size is asserted here rather than discovered at upload time — a
# rejection surfaces after the whole build has run, which is an expensive way
# to learn that an artboard was 16px too wide.
TARGETS = {
    "phone": {
        "size": (1242, 2688),
        # deliver picks the device from the folder name.
        "ios": REPO / "fastlane/screenshots/en-US",
        "ios_prefix": "iPhone 11 Pro Max-",
        "android": REPO / "fastlane/metadata/android/en-US/images/phoneScreenshots",
    },
    "ipad": {
        "size": (2048, 2732),
        "ios": REPO / "fastlane/screenshots/en-US",
        "ios_prefix": "IPAD_PRO_3GEN_129-",
        "android": REPO / "fastlane/metadata/android/en-US/images/tenInchScreenshots",
    },
}


def check(device: str, spec: dict) -> list[str]:
    problems = []
    for i in range(1, 6):
        src = OUT / device / f"{i}.png"
        if not src.exists():
            problems.append(f"missing {src.relative_to(REPO)}")
            continue
        size = Image.open(src).size
        if size != spec["size"]:
            problems.append(
                f"{src.relative_to(REPO)} is {size[0]}x{size[1]}, "
                f"store wants {spec['size'][0]}x{spec['size'][1]}"
            )
    return problems


# Play's listing graphics, checked here even though this script does not
# produce them. `supply` refuses a wrongly-sized image by aborting the ENTIRE
# edit — the AAB and the track update go with it — so a 4167x4167 icon lost a
# whole release after a 24-minute Gradle build. Uploaded only when
# `skip_upload_images` is false in the Fastfile; the check stays regardless, so
# turning that flag on can never be the thing that discovers a bad asset.
PLAY_GRAPHICS = {
    "icon.png": (512, 512),
    "featureGraphic.png": (1024, 500),
}


def check_play_graphics() -> list[str]:
    problems = []
    base = REPO / "fastlane/metadata/android/en-US/images"
    for name, expected in PLAY_GRAPHICS.items():
        path = base / name
        if not path.exists():
            continue
        size = Image.open(path).size
        if size != expected:
            problems.append(
                f"{path.relative_to(REPO)} is {size[0]}x{size[1]}, "
                f"Play wants {expected[0]}x{expected[1]}"
            )
    return problems


def publish(device: str, spec: dict) -> int:
    spec["ios"].mkdir(parents=True, exist_ok=True)
    spec["android"].mkdir(parents=True, exist_ok=True)
    copied = 0
    for i in range(1, 6):
        src = OUT / device / f"{i}.png"
        shutil.copy2(src, spec["ios"] / f"{spec['ios_prefix']}{i}.png")
        shutil.copy2(src, spec["android"] / f"{i}.png")
        copied += 1
    return copied


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify sizes, write nothing")
    args = ap.parse_args()

    problems = []
    for device, spec in TARGETS.items():
        problems += check(device, spec)
    problems += check_play_graphics()

    if problems:
        for p in problems:
            print(f"  ! {p}", file=sys.stderr)
        print("\nRun ./capture.sh first.", file=sys.stderr)
        return 1

    if args.check:
        print("all screenshots present and correctly sized")
        return 0

    for device, spec in TARGETS.items():
        n = publish(device, spec)
        print(f"  {device}: {n} -> {spec['ios'].relative_to(REPO)}")
        print(f"  {device}: {n} -> {spec['android'].relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
