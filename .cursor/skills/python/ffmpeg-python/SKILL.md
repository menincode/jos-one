---
name: ffmpeg-python
user-invocable: true
description: >
  Build FFmpeg filter graphs and run ffprobe with the ffmpeg-python library
  (compile, run, probe). Use when users mention ffmpeg-python, import ffmpeg,
  ffmpeg.compile, ffmpeg.probe, filter_complex, overlay, concat, trim, or
  Python FFmpeg wrappers.
---

# ffmpeg-python

## What this skill does

- Guides the **ffmpeg-python** package (`import ffmpeg`): input/output streams, filters, compile, run, probe.
- Helps choose between the **graph API** and raw **`-filter_complex`** strings.
- Covers installation pitfalls, debugging argv, and common FFmpeg gotchas the wrapper does not hide.

## When to use

Activate when the task includes:

- `ffmpeg-python`, `import ffmpeg`, `ffmpeg.input`, `ffmpeg.output`
- `ffmpeg.compile`, `get_args`, `ffmpeg.run`, `run_async`
- `ffmpeg.probe`, ffprobe JSON metadata
- Filter graphs: `overlay`, `concat`, `scale`, `trim`, `xfade`, custom `.filter()`

## Quick workflow

1. **Confirm install** — `pip install ffmpeg-python` (not `ffmpeg` or `python-ffmpeg`).
2. **Confirm FFmpeg on PATH** — `ffmpeg` and `ffprobe` must exist separately; the library does not install them.
3. **Build the graph** — `input` → filters → `output`; use `.filter()` for filters without shorthand.
4. **Inspect before run** — `stream.get_args()` or `ffmpeg.compile(stream, cmd='ffmpeg')`.
5. **Execute** — `.run()` / `ffmpeg.run(stream)` or `run_async` for pipes; pass `cmd=` if the binary is not on default PATH.

## Core guardrails

- **Wrong package:** `pip install ffmpeg` installs a different project; use **`ffmpeg-python`** only.
- **No bundled FFmpeg:** document or configure binary paths; use `cmd=` in `compile`, `run`, and `probe` when needed.
- **Audio streams:** many video filters drop audio — split with `.audio` / `.video` and remux explicitly when required.
- **Overwrite output:** use `.overwrite_output()` or `overwrite_output=True` on `compile`/`run` to avoid interactive prompts.
- **Stale wrapper:** PyPI release is **0.2.0** (2019); uncommon filters may need `ffmpeg.filter(stream, 'name', ...)` instead of shorthand helpers.
- **Complex graphs:** directed acyclic only; for very large graphs, a tested `filter_complex` string plus `ffmpeg.input(..., f='lavfi')` or global args may be clearer.

## Graph API vs `-filter_complex`

| Prefer graph API | Prefer raw `filter_complex` |
|------------------|----------------------------|
| Multi-step chains with typed helpers (`overlay`, `concat`) | One long chain already validated in FFmpeg CLI |
| Prototyping — inspect `get_args()` | Copy-paste from `ffmpeg -filter_complex` docs |
| Single-input filter pipelines | Many labeled pads `[v0][v1]xfade=...` |

For `filter_complex` with the library, pass the string via `ffmpeg.input(...).filter('complex', ...)` or build inputs and use `ffmpeg.output(..., vf=...)` / global options per upstream examples; when awkward, shell out with `subprocess` and argv from `compile` of the non-filter parts only.

## Key API (cheat sheet)

| API | Purpose |
|-----|---------|
| `ffmpeg.input(path, **kwargs)` | Input; kwargs → FFmpeg options (`ss`, `t`, `f`, …) |
| `ffmpeg.output(*streams, filename, **kwargs)` | Output mux |
| `ffmpeg.filter(stream, name, *args, **kwargs)` | Any filter |
| `ffmpeg.concat`, `overlay`, `hflip`, … | Shorthand filters |
| `ffmpeg.merge_outputs(*streams)` | Multiple outputs |
| `ffmpeg.compile(stream, cmd='ffmpeg', overwrite_output=False)` | Full command argv |
| `stream.get_args()` | Args without executable |
| `ffmpeg.run` / `run_async` | Subprocess |
| `ffmpeg.probe(path, cmd='ffprobe', **kwargs)` | Metadata JSON |

Special FFmpeg option names (`-b:v`, `-qscale:v`) use dict kwargs: `**{'b:v': '1M'}`.

## Additional resources

- Detailed API notes: [reference.md](reference.md)
- Examples: [examples.md](examples.md)

## References

- Repository: <https://github.com/kkroening/ffmpeg-python>
- API docs: <https://kkroening.github.io/ffmpeg-python/>
- Examples: <https://github.com/kkroening/ffmpeg-python/tree/master/examples>
- FFmpeg filters: <https://ffmpeg.org/ffmpeg-filters.html>
