"""Build Windows .ico from JOSVN brand PNG (title bar, taskbar, PyInstaller exe)."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PNG = REPO_ROOT / "frontend" / "public" / "brand" / "josvn-icon.png"
OUTPUT_ICO = REPO_ROOT / "packaging" / "assets" / "josvn-icon.ico"
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)


def main() -> None:
    if not SOURCE_PNG.is_file():
        raise SystemExit(f"Brand icon not found: {SOURCE_PNG}")

    try:
        from PIL import Image
    except ImportError as exc:
        raise SystemExit(
            "Pillow required to build .ico. Run: uv sync --group dev"
        ) from exc

    OUTPUT_ICO.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE_PNG) as img:
        rgba = img.convert("RGBA")
        rgba.save(
            OUTPUT_ICO,
            format="ICO",
            sizes=[(s, s) for s in ICO_SIZES],
        )
    print(f"Wrote {OUTPUT_ICO}")


if __name__ == "__main__":
    main()
