"""Generate the pixel-art window frames behind PixelPanel (and its glyphs).

Each frame is a tiny RPG-style window drawn on an exact pixel grid: a dark
outline with notched corners, a bevel (light on the top/left, shade on the
bottom/right), a coloured rim, a dark inner line and a dithered fill. It is
saved at 1x/2x/3x with every art pixel = ART_PX points, so iOS draws it
1:1 and 9-slices it with cap insets (tiling the edges and fill), which keeps
the corners crisp at any panel size.

Keep CAP and ART_PX in sync with FRAME_CAP_INSET in
components/pixel-panel.tsx.

Usage (needs Pillow):
  python3 scripts/generate-pixel-frames.py
"""
from pathlib import Path

from PIL import Image

APP = Path(__file__).resolve().parent.parent
OUT = APP / "assets" / "frames"

# Art pixels: corner caps on each side, and the tiled middle.
CAP = 4
MID = 4
SIZE = CAP * 2 + MID
# Points per art pixel.
ART_PX = 2


def hex_rgba(value: str) -> tuple[int, int, int, int]:
    value = value.lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), 255)


# outline, light (top/left bevel), rim, shade (bottom/right bevel), inner line,
# fill, fleck (dither in the fill).
FRAMES = {
    "blue": ["#000a1c", "#4f9bff", "#1f5fbf", "#0a2f6b", "#00112a", "#01224e", "#03295a"],
    "button": ["#000a1c", "#9ccbff", "#3a8df0", "#0b3f86", "#0b3f86", "#1559b0", "#1861bc"],
    "gold": ["#1c1200", "#fff3b0", "#ffd23f", "#b07a00", "#2a1e00", "#01224e", "#03295a"],
    "green": ["#001a0c", "#c8ffdc", "#5bd16b", "#1f7a3a", "#00210f", "#01224e", "#03295a"],
    "purple": ["#12001f", "#e6d2ff", "#b57cff", "#5a2f99", "#16062b", "#01224e", "#03295a"],
    "red": ["#1f0006", "#ffc2c2", "#ff5a5a", "#8a1f1f", "#2a0610", "#2a0b1a", "#33101f"],
    # Recessed well: the bevel colours swap (dark top/left, light bottom/right).
    "well": ["#062a5a", "#000814", "#011a3a", "#1f5fbf", "#011a3a", "#011a3a", "#011a3a"],
}


# Small glyphs drawn on the same 2 pt grid: "#" white, "o" dark outline.
GLYPHS = {
    "arrow-left": [
        "...oo....",
        "..o#o....",
        ".o##ooooo",
        "o#######o",
        ".o##ooooo",
        "..o#o....",
        "...oo....",
    ],
    "chevron-right": [
        "oo...",
        "o#o..",
        "oo#o.",
        ".o##o",
        "oo#o.",
        "o#o..",
        "oo...",
    ],
}
GLYPH_COLORS = {"#": "#ffffff", "o": "#000a1c"}


def depth(x: int, y: int) -> tuple[int, int, int] | None:
    """Distance into the frame, or None for the cut-off corner pixels."""
    dx = min(x, SIZE - 1 - x)
    dy = min(y, SIZE - 1 - y)
    if dx + dy < 2:
        return None
    return min(dx, dy, dx + dy - 2), dx, dy


def lit_side(x: int, y: int, dx: int, dy: int) -> bool:
    """True on the top/left half of the bevel."""
    if dy < dx:
        return y < SIZE / 2
    if dx < dy:
        return x < SIZE / 2
    # Corner diagonals: only the top-left one is lit (the right and bottom
    # edges run the full length, like a classic bevel).
    return x < SIZE / 2 and y < SIZE / 2


def draw(palette: list[str]) -> Image.Image:
    outline, light, rim, shade, inner, fill, fleck = map(hex_rgba, palette)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    for y in range(SIZE):
        for x in range(SIZE):
            d = depth(x, y)
            if d is None:
                continue
            level, dx, dy = d
            if level == 0:
                color = outline
            elif level == 1:
                color = light if lit_side(x, y, dx, dy) else shade
            elif level == 2:
                color = rim
            elif level == 3:
                color = inner
            else:
                # Sparse diagonal fleck, period MID so the tiled fill is seamless.
                fx, fy = (x - CAP) % MID, (y - CAP) % MID
                color = fleck if (fx, fy) in ((1, 1), (3, 3)) else fill
            img.putpixel((x, y), color)
    return img


def draw_glyph(rows: list[str]) -> Image.Image:
    img = Image.new("RGBA", (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in GLYPH_COLORS:
                img.putpixel((x, y), hex_rgba(GLYPH_COLORS[ch]))
    return img


def save(base: Path, img: Image.Image) -> None:
    for scale in (1, 2, 3):
        px = ART_PX * scale
        suffix = "" if scale == 1 else f"@{scale}x"
        img.resize((img.width * px, img.height * px), Image.NEAREST).save(
            f"{base}{suffix}.png", optimize=True
        )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, palette in FRAMES.items():
        save(OUT / f"frame-{name}", draw(palette))
    for name, rows in GLYPHS.items():
        save(OUT / f"glyph-{name}", draw_glyph(rows))
    print(f"wrote {len(FRAMES)} frames and {len(GLYPHS)} glyphs to {OUT.relative_to(APP)}")


if __name__ == "__main__":
    main()
