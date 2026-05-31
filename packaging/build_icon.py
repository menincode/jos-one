"""Build Windows .ico from JOSVN brand PNG (title bar, taskbar, PyInstaller exe)."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PNG = REPO_ROOT / "frontend" / "public" / "brand" / "josvn-icon.png"
OUTPUT_ICO = REPO_ROOT / "packaging" / "assets" / "josvn-icon.ico"
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)


def main() -> None:
    if OUTPUT_ICO.is_file():
        print(f"Using existing {OUTPUT_ICO}")
        return

    if not SOURCE_PNG.is_file():
        raise SystemExit(
            f"Brand icon not found: {SOURCE_PNG}. "
            f"Restore {OUTPUT_ICO} from git or add the PNG source."
        )

    try:
        from PIL import Image
    except ImportError as exc:
        raise SystemExit(
            f"Missing {OUTPUT_ICO}. Install Pillow to rebuild from PNG: "
            "uv pip install pillow && make build-icon"
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
