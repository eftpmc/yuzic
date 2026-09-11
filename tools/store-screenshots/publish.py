#!/usr/bin/env python3
"""Copy generated screenshots to their published destinations.

`deliver` (iOS) and `supply` (Android) each expect their own directory layout
and filenames, and neither reads `tools/store-screenshots/out/`. `--readme`
copies four clean, unframed captures from `raw/phone/` into the README gallery.
Both sets originate from the same Maestro capture; neither is maintained by hand.

    python3 publish.py            # store listing images only
    python3 publish.py --check    # verify store-listing inputs, write nothing
    python3 publish.py --readme   # update the README gallery only
    python3 publish.py --check-readme

`--readme` never reads or writes Fastlane metadata.

For iOS, filenames are ordered by their leading number — deliver sorts
alphabetically and uses that as listing order. Android takes any name and sorts
by it, so the same digits work there.
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
RAW = HERE / "raw"
README_DESTINATION = REPO / "assets/screenshots"
README_SCREENSHOTS = {
    "home": "home.png",
    "player": "player.png",
    "artist": "artist.png",
    "downloads": "downloads.png",
}

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


def publish_store(device: str, spec: dict) -> int:
    spec["ios"].mkdir(parents=True, exist_ok=True)
    spec["android"].mkdir(parents=True, exist_ok=True)
    copied = 0
    for i in range(1, 6):
        src = OUT / device / f"{i}.png"
        shutil.copy2(src, spec["ios"] / f"{spec['ios_prefix']}{i}.png")
        shutil.copy2(src, spec["android"] / f"{i}.png")
        copied += 1
    return copied


def check_readme() -> list[str]:
    problems = []
    for shot_id in README_SCREENSHOTS:
        source = RAW / "phone" / f"{shot_id}.png"
        if not source.exists():
            problems.append(f"missing {source.relative_to(REPO)}")
            continue
        try:
            Image.open(source).verify()
        except OSError as error:
            problems.append(f"invalid {source.relative_to(REPO)}: {error}")
    return problems


def publish_readme() -> int:
    """Copy clean phone captures only; never touch Fastlane paths."""
    README_DESTINATION.mkdir(parents=True, exist_ok=True)
    copied = 0
    for shot_id, destination_name in README_SCREENSHOTS.items():
        source = RAW / "phone" / f"{shot_id}.png"
        shutil.copy2(source, README_DESTINATION / destination_name)
        copied += 1
    return copied


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify store-listing inputs, write nothing")
    ap.add_argument("--readme", action="store_true", help="update the README gallery only")
    ap.add_argument("--check-readme", action="store_true", help="verify README-gallery inputs, write nothing")
    args = ap.parse_args()

    if args.readme or args.check_readme:
        problems = check_readme()
        if problems:
            for problem in problems:
                print(f"  ! {problem}", file=sys.stderr)
            print("\nRun ./capture.sh phone first.", file=sys.stderr)
            return 1
        if args.check_readme:
            print("README screenshots present and valid")
            return 0
        copied = publish_readme()
        print(f"  README: {copied} clean phone captures -> {README_DESTINATION.relative_to(REPO)}")
        return 0

    problems = []
    for device, spec in TARGETS.items():
        problems += check(device, spec)
    problems += check_play_graphics()

    if problems:
        for problem in problems:
            print(f"  ! {problem}", file=sys.stderr)
        print("\nRun ./capture.sh first.", file=sys.stderr)
        return 1

    if args.check:
        print("all store screenshots present and correctly sized")
        return 0

    for device, spec in TARGETS.items():
        copied = publish_store(device, spec)
        print(f"  {device}: {copied} -> {spec['ios'].relative_to(REPO)}")
        print(f"  {device}: {copied} -> {spec['android'].relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
