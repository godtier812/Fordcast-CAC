"""Deterministic Dip icon and map-style generation (code-native artwork)."""

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "mobile/assets"


def icon(size: int, background: bool, monochrome: bool = False) -> Image.Image:
    image = Image.new("RGBA", (size, size), "#0E1726" if background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    scale = size / 48
    points = [
        (x * scale, y * scale)
        for x, y in ((10, 15), (18, 15), (24, 29), (30, 15), (38, 15))
    ]
    draw.line(points, fill="#F2F5FA", width=max(1, round(2.5 * scale)), joint="curve")
    wave = [
        (x * scale, y * scale)
        for x, y in (
            (9, 34),
            (13, 32),
            (17, 34),
            (21, 36),
            (25, 34),
            (29, 32),
            (33, 34),
            (39, 34),
        )
    ]
    draw.line(
        wave,
        fill="#FFFFFF" if monochrome else "#2BD9D9",
        width=max(1, round(2.3 * scale)),
        joint="curve",
    )
    return image


def main():
    target = ASSETS / "images"
    target.mkdir(parents=True, exist_ok=True)
    for name, size, bg, mono in (
        ("icon", 1024, True, False),
        ("android-icon-foreground", 1024, False, False),
        ("android-icon-monochrome", 1024, False, True),
        ("splash-icon", 512, False, False),
        ("notification-icon", 96, False, True),
        ("favicon", 64, True, False),
    ):
        icon(size, bg, mono).save(target / f"{name}.png")
    source = ROOT / "data/raw/smoke/ofm-style.json"
    if source.exists():
        style = json.loads(source.read_text(encoding="utf-8"))
        style["name"] = "FordCast Night"
        for layer in style["layers"]:
            kind, name = layer["type"], layer["id"].lower()
            paint = layer.setdefault("paint", {})
            if kind == "background":
                paint["background-color"] = "#0B1320"
            elif kind == "fill":
                paint["fill-color"] = "#123E4C" if "water" in name else "#101C2E"
                if "fill-outline-color" in paint:
                    paint["fill-outline-color"] = "#24344F"
            elif kind == "line":
                paint["line-color"] = "#2BD9D9" if "water" in name else "#2A3A55"
            elif kind == "symbol":
                paint["text-color"] = "#B4BFD0"
                paint["text-halo-color"] = "#0B1320"
        mapdir = ASSETS / "map"
        mapdir.mkdir(parents=True, exist_ok=True)
        (mapdir / "fordcast-night.json").write_text(json.dumps(style), encoding="utf-8")
    print("Generated Dip assets and bundled FordCast Night style.")


if __name__ == "__main__":
    main()
