# RS001 — ffmpeg-python library & Cursor skill

**Date:** 2026-05-25  
**Scope:** Python desktop (`jos-desktop`), video merge pipeline under `python/services/video_merge/`

---

## Summary

**ffmpeg-python** (PyPI `ffmpeg-python`, import `ffmpeg`) is a pure-Python wrapper that builds FFmpeg CLI arguments from a directed acyclic filter graph. It does **not** bundle or install FFmpeg. This repo pins `ffmpeg-python>=0.2.0` (last release **0.2.0**, July 2019) and bundles `ffmpeg`/`ffprobe` via `python/services/plugin_downloader.py` into `plugins/`.

The intended architecture here is **hybrid**:

1. **ffmpeg-python** — compile graphs (`compile`, `get_args`), `ffmpeg.probe` with custom `cmd=`, simple inputs/outputs.
2. **Raw `filter_complex` strings** — complex per-clip chains (`clip_render.py`, `runner.py` xfade) where graph builders are awkward.
3. **Subprocess runner** — `ffmpeg_runner` (referenced by tests; implement under `python/services/video_merge/ffmpeg_runner.py`) runs compiled commands, captures stderr for progress (`ffmpeg_log.py`), and uses plugin binary paths.

Cursor skill: `.cursor/skills/python/ffmpeg-python/`.

---

## Library overview

| Item | Detail |
|------|--------|
| Package | `pip install ffmpeg-python` (not `ffmpeg` or `python-ffmpeg`) |
| Import | `import ffmpeg` |
| Maintainer | [kkroening/ffmpeg-python](https://github.com/kkroening/ffmpeg-python) |
| Docs | [API reference](https://kkroening.github.io/ffmpeg-python/) |
| FFmpeg binary | User/project responsibility; here: `get_ffmpeg_path()` / `get_ffprobe_path()` |

### Core API

| Function | Role |
|----------|------|
| `ffmpeg.input(path, **kwargs)` | Input stream; kwargs map to FFmpeg options (`t`, `ss`, `fflags`, …) |
| `ffmpeg.output(*streams, filename, **kwargs)` | Output mux (`vcodec`, `acodec`, maps via separate argv in this project) |
| `ffmpeg.filter` / `.filter()` | Generic filter; use for filters without shorthand |
| `ffmpeg.concat`, `overlay`, `hflip`, … | Shorthand filters |
| `ffmpeg.compile(stream, cmd='ffmpeg', overwrite_output=False)` | Full argv including executable |
| `stream.get_args()` | Args without executable |
| `ffmpeg.run` / `run_async` | Execute subprocess |
| `ffmpeg.probe(filename, cmd='ffprobe', **kwargs)` | JSON metadata via ffprobe |

### Debugging commands

```python
cmd = ffmpeg.compile(stream, cmd=str(ffmpeg_exe))
# or
args = stream.get_args()
```

---

## Pros

- Expresses **filter graphs** in Python instead of hand-built `-filter_complex` for medium complexity.
- **`compile` / `get_args`** make unit tests deterministic (assert argv without running FFmpeg).
- **`probe(..., cmd=ffprobe_path)`** fits bundled binaries (see `test_ffmpeg_runner.py`).
- Composable fluent API; arbitrary filters via `.filter('name', ...)`.
- Zero native extension — only subprocess to FFmpeg.

---

## Cons

- **Stale maintenance:** 0.2.0 since 2019; slow issue/PR velocity.
- **No FFmpeg install** — must align with project plugin downloader and PATH.
- **Complex graphs** can be harder to read than a single tested `filter_complex` string (this repo uses strings for clip render / xfade).
- **Audio gotchas:** some filters drop audio; must map `.audio` / `.video` explicitly when using graph API.
- **Not a codec SDK** — no frame-level Python API (unlike PyAV).

---

## Alternatives

| Approach | Best for | Trade-off |
|----------|----------|-----------|
| **ffmpeg-python** | Graph compile, probe, multi-input glue | Thin wrapper; learning curve for graphs |
| **subprocess only** | Max control, one-off scripts | Error-prone argv; no compile helper |
| **PyAV** | Frame decode/encode in Python | Heavy; filter graphs still often need FFmpeg CLI |
| **moviepy** | High-level editing | Abstraction leak; depends on FFmpeg anyway |
| **shell scripts** | Ops / CI | Poor testability in Python app |

**Recommendation for this repo:** Keep **ffmpeg-python** for `compile_graph`, `probe_media`, and concat demuxer graphs; keep **documented `filter_complex` strings** for clip render and xfade; centralize execution in **`ffmpeg_runner`** with plugin paths and stderr progress parsing.

---

## Project integration (current)

| Area | Path / pattern |
|------|----------------|
| Dependency | `pyproject.toml` → `ffmpeg-python>=0.2.0` |
| Binaries | `plugin_downloader`: `plugins/ffmpeg.exe`, `plugins/ffprobe.exe` |
| Clip render | `clip_render.py` → `run_filter_complex` + string chains |
| Merge / xfade | `runner.py` → `run_filter_complex`, `run_concat_copy` |
| Duration | `duration.py` → `probe_media`, `run_blocking` |
| Encode presets | `ffmpeg_encode` (imported; implement alongside runner) |
| GPU | `ffmpeg_hw` — `JOS_FFMPEG_GPU`, `JOS_FFMPEG_HWACCEL_DECODE` |
| Logging / progress | `ffmpeg_log.py` — parse `time=`, `speed=`, `frame=` from stderr |

**Gap:** `ffmpeg_runner`, `ffmpeg_encode`, and `ffmpeg_hw` are imported and covered by tests but module files are not present under `python/services/video_merge/` yet — implement per `test_ffmpeg_runner.py` and related tests before shipping.

---

## Best practices (this codebase)

1. Always pass **`cmd=`** / compile with **`ffmpeg_exe`** from `get_ffmpeg_path()`, not system PATH alone.
2. Prefer **`compile_graph` → `run_command`** over `ffmpeg.run()` so logging, cancellation, and progress hooks stay consistent.
3. For **NVENC/QSV**, align filter `format=` with encoder (`nv12` for `h264_nvenc`) — see `clip_render._filter_output_pixel_format`.
4. Cap runaway encodes: **`-t`**, **`-frames:v`**, `+genpts+igndts` on input (see `render_clip_segment`).
5. Log full argv via `ffmpeg_log.log_ffmpeg_command` before run.
6. Verify with **`pytest python/tests/test_ffmpeg*.py`** after runner changes.

---

## Recommendation

| Decision | Choice |
|----------|--------|
| Keep ffmpeg-python? | **Yes** — compile/probe layer matches project tests and hybrid design |
| Replace with subprocess-only? | Only if dropping the dependency; you lose `compile` test ergonomics |
| Cursor skill | **Created** at `.cursor/skills/python/ffmpeg-python/` |
| Next implementation step | Add `ffmpeg_runner.py` (+ `ffmpeg_encode.py`, `ffmpeg_hw.py`) to satisfy imports and tests |

---

## References

- [ffmpeg-python README](https://github.com/kkroening/ffmpeg-python)
- [ffmpeg-python API](https://kkroening.github.io/ffmpeg-python/)
- [FFmpeg filter docs](https://ffmpeg.org/ffmpeg-filters.html)
- Project skill: `.cursor/skills/python/ffmpeg-python/SKILL.md`

---

## Next Steps & User Guidance

### Immediate Actions

1. Review this research and the new skill under `.cursor/skills/python/ffmpeg-python/`.
2. Implement missing `ffmpeg_runner` (and related modules) if video merge is active work.
3. Run `pytest python/tests/test_ffmpeg*.py` after implementation.

### Related Commands

| Command | Purpose |
|---------|---------|
| `/plan` | Plan `ffmpeg_runner` implementation from test contracts |
| `/feature` | Implement video merge FFmpeg layer |
| `/test` | Extend FFmpeg regression tests |
| `/fix` | Debug encode/probe failures with `investigate-root-cause` |

### Workflow

```
/research (this doc) → /plan ffmpeg_runner → /feature → pytest test_ffmpeg*
```
