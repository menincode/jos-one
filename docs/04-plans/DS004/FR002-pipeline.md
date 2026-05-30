# FR002 — Video merge `pipeline.py`

**Parent:** DS004 | **Depends on:** FR001 (`io.parse_export_settings`) | **Blocks:** FR003  
**Design:** [DS004](../../03-design/DS004-ffmpeg-python-video-merge.md)

---

## Goal

One file `pipeline.py`: planner + per-clip standardize (ffmpeg-python hybrid) + concat join (+ optional logo). Expose `plan_mix_rows` and `render_mix_row`.

---

## Public API

```python
def plan_mix_rows(
    mix_rows: list[dict],
    videos: list[dict],
    *,
    duration_min_sec: float,
    duration_max_sec: float,
    seed: int | None = None,
) -> dict:  # {ok, message?, rows: [{id, leading_paths, tail_paths, sequence_paths, total_duration_sec}]}

def render_mix_row(
    *,
    row_id: str,
    sequence_paths: list[str],
    export_config: ExportRenderConfig,
    output_path: Path,
    temp_dir: Path,
    concurrency: int,
    logo_path: str | None,
    on_progress: Callable[[float, float, str], None] | None,  # duration_sec, speed_x, message
    cancel_check: Callable[[], bool],
) -> tuple[bool, str, float | None, float | None]:  # ok, message, out_duration, out_speed
```

---

## Tasks

### Phase 1: Log parsers (Mix table columns)

| # | Task | Size | Depends |
|---|------|------|---------|
| 1 | Create `python/tests/test_video_merge_pipeline.py` — tests for `_parse_duration_from_log`, `_parse_speed_from_log` using sample stderr from old `test_ffmpeg_log_parse.py` | S | FR001 |
| 2 | Implement `_parse_duration_from_log`, `_parse_speed_from_log` at top of `pipeline.py` | S | 1 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py -k parse -q
```

---

### Phase 2: Planner

| # | Task | Size | Depends |
|---|------|------|---------|
| 3 | Port 6–8 core tests from `test_mix_planner.py` into `test_video_merge_pipeline.py` | M | 1 |
| 4 | Implement `plan_mix_rows` — leading validation, tail backtracking, duplicate leading across rows, `sequence_paths = leading + tail` | L | 3 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py -k plan_mix -q
```

---

### Phase 3: FFmpeg helpers

| # | Task | Size | Depends |
|---|------|------|---------|
| 5 | Implement `_get_binaries()` → `(ffmpeg_path, ffprobe_path)` via `plugin_downloader`; fail clear VI message if missing | S | 2 |
| 6 | Implement `_probe_media` wrapper (or reuse pattern from `io.py`) | S | 5 |
| 7 | Implement `_run_ffmpeg(cmd, on_stderr_line)` — `subprocess.Popen`, track PID in module list for cancel (job will register); parse stderr → call `on_stderr_line` | M | 6 |
| 8 | Implement `_build_video_filter_chain(width, height, fps, zoom, speed) -> str` | S | 2 |
| 9 | Test filter chain order: `setpts` before `scale` before speed `setpts` before `yuv420p` | S | 8 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py -k filter_chain -q
```

---

### Phase 4: Render segment

| # | Task | Size | Depends |
|---|------|------|---------|
| 10 | Test `_render_segment` with mock `_run_ffmpeg` — assert `filter_complex` contains scale/fps, no nvenc | S | 8 |
| 11 | Implement `_render_segment(src, dest, config, zoom, speed, on_progress)` — `ffmpeg.probe` audio; `run` via argv from filter_complex + libx264/aac constants | L | 10 |
| 12 | `ThreadPoolExecutor` in helper `_render_all_segments(paths, effects, temp_dir, concurrency, ...)` | M | 11 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py -k render_segment -q
```

---

### Phase 5: Concat join

| # | Task | Size | Depends |
|---|------|------|---------|
| 13 | Test `_write_concat_list` + `_concat_segments` builds `-f concat` argv (mock run) | S | 7 |
| 14 | Implement concat with `-c copy` when segments share params | M | 13 |
| 15 | If `logo_path` exists: single re-encode pass with `overlay` + `logoPosition` map (9 positions); else copy only | M | 14 |
| 16 | Implement `render_mix_row` orchestration: segments → concat → probe output duration if needed | M | 12, 15 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py -q
```

---

## Constants (top of `pipeline.py`)

```python
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ...}  # align io.py
LIBX264_ARGS = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20"]
AAC_ARGS = ["-c:a", "aac", "-b:a", "192k"]
```

**v1:** Ignore `sceneTransition` in `ExportRenderConfig`.

---

## Files

| Action | Path |
|--------|------|
| Create | `python/services/video_merge/pipeline.py` |
| Create | `python/tests/test_video_merge_pipeline.py` |

---

## Acceptance

- [ ] `test_video_merge_pipeline.py` fully green without real FFmpeg (mock subprocess)
- [ ] `plan_mix_rows` matches ported planner test expectations
- [ ] `render_mix_row` callable from job with progress callback supplying parse fields

---

## Next

`/execute-plan docs/04-plans/DS004/FR003-job.md`
