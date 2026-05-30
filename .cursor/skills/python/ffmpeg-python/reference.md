# ffmpeg-python — API reference

## Installation

```bash
pip install ffmpeg-python
```

```python
import ffmpeg  # not: pip install ffmpeg
```

Install [FFmpeg](https://ffmpeg.org/download.html) separately and ensure `ffmpeg` / `ffprobe` are on `PATH`, or pass `cmd=` to run/probe/compile.

## Stream model

- Each operation returns a `Stream` node in a **directed acyclic** graph.
- `ffmpeg.input(filename, **kwargs)` — demuxer/input options.
- `ffmpeg.output(*streams_and_filename, **kwargs)` — last positional is output path when provided.
- Filters attach with `.filter()`, shorthand methods (`.hflip()`), or `ffmpeg.filter()`.

## Running

```python
# Blocking
ffmpeg.run(stream, capture_stdout=False, capture_stderr=False, overwrite_output=False)

# Non-blocking
process = ffmpeg.run_async(stream, pipe_stdout=False, pipe_stderr=False)

# Fluent
(stream.input(...).output(...).overwrite_output().run())
```

Pass `cmd='/path/to/ffmpeg'` when the binary is not the default `ffmpeg` on PATH.

## Compile / debug

```python
args = stream.get_args()
full = ffmpeg.compile(stream, cmd='ffmpeg', overwrite_output=True)
# full[0] is the executable
```

Use this to unit-test argv without executing FFmpeg.

## Probe (ffprobe)

```python
probe = ffmpeg.probe('in.mp4', cmd='ffprobe')
video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
duration = float(probe['format']['duration'])
```

## Filters

**Shorthand** (when defined in `_filters.py`):

```python
ffmpeg.concat(stream_a, stream_b, v=1, a=1)
ffmpeg.overlay(main, overlay, x=10, y=10)
```

**Generic:**

```python
ffmpeg.filter(stream, 'fps', fps=25, round='up')
ffmpeg.filter([main, logo], 'overlay', 10, 10)
```

**Multi-output:**

```python
split = ffmpeg.input('in.mp4').filter_multi_output('split')
# split[0], split[1], ...
```

**Expressions** (evaluated by FFmpeg, not Python):

```python
ffmpeg.filter(stream, 'crop', 'in_w-2*10', 'in_h-2*20')
```

## Global / output options

- `ffmpeg.overwrite_output(stream)` — adds `-y`.
- Colon options: `ffmpeg.output(s, 'out.mp4', **{'b:v': '1M', 'qscale:v': 3})`.

## Audio / video split

```python
inp = ffmpeg.input('in.mp4')
audio = inp.audio
video = inp.video
# process separately, then ffmpeg.output(video, audio, 'out.mp4')
```

## Alternatives

| Need | Option |
|------|--------|
| argv only, no graph | `subprocess` + hand-built list |
| Frames in Python | PyAV |
| High-level editing | moviepy (still uses FFmpeg) |

## Limitations

- Last PyPI release **0.2.0** — verify behavior against your FFmpeg version.
- Does not validate filter graphs at build time; errors appear at FFmpeg runtime.
- Not all filters have Python shorthands — use `.filter('name', ...)`.
