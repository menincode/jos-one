# Plan: DS005 — FR003 Parallel clip pool (per row)

**Parent:** [index.md](./index.md)  
**Design:** DS005 § PR2  
**Depends on:** FR001 (stable `_render_segment` with optional logo)  
**Independent of:** FR002

---

## Goal

Replace sequential clip loop in `render_mix_row` with `FfmpegTaskPool`; document concurrency² in Settings UI.

---

## Tasks

| # | Task | Size | Depends |
|---|------|------|---------|
| 1 | Update `ffmpeg_pool.py` docstrings (per-row scope) | S | — |
| 2 | Add failing test: `render_mix_row` uses pool | M | — |
| 3 | Wire pool in `render_mix_row` | L | 1, 2 |
| 4 | Progress callbacks under parallel clips | M | 3 |
| 5 | Concurrency Settings tooltip | S | — |
| 6 | Pool failure + order tests | M | 3 |
| 7 | Full pytest + manual concurrency check | M | 3–6 |

---

## Task 1: Docstrings

**File:** `python/services/video_merge/ffmpeg_pool.py`

**Change:**

- Module doc: *“Per-row FFmpeg segment pool (one pool per `render_mix_row` invocation).”*
- `FfmpegTaskPool` class doc: *“Thread pool sized by `export_config.concurrency`; not shared across rows.”*

No behavior change.

---

## Task 2: Failing integration-style test

**File:** `python/tests/test_video_merge_pipeline.py`

**Add** `test_render_mix_row_uses_ffmpeg_task_pool`:

- Patch `FfmpegTaskPool.render_segments` to record call + return fake segment paths in order.
- Patch `_concat_segments` to succeed.
- Call `render_mix_row` with 3 clips, `concurrency=2`.
- Assert `FfmpegTaskPool.render_segments` called once with 3 tasks, `clip_index` 0..2.

**Command:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py::test_render_mix_row_uses_ffmpeg_task_pool -v
```

Fails until Task 3.

---

## Task 3: Wire pool in `render_mix_row`

**File:** `python/services/video_merge/pipeline.py`

**Replace** sequential loop (~871–903) with:

```python
from python.services.video_merge.ffmpeg_pool import (
    FfmpegTaskPool,
    RowClipProgress,
    SegmentRenderTask,
)

tasks = [
    SegmentRenderTask(
        row_id=row_id,
        clip_index=i,
        clip_total=n,
        src_path=sequence_paths[i],
        dest_path=temp_dir / f"seg_{i:04d}.mp4",
        zoom=effects[i][0],
        speed=effects[i][1],
    )
    for i in range(n)
]
row_progress = RowClipProgress(n)

def on_clip_progress(clip_idx, basename, dur, spd):
    # same emit_progress message format as current loop
    ...

with FfmpegTaskPool(max_workers=max(1, export_config.concurrency)) as pool:
    results = pool.render_segments(
        tasks,
        export_config=export_config,
        ffmpeg_bin=ffmpeg_bin,
        ffprobe_bin=ffprobe_bin,
        row_progress=row_progress,
        on_clip_progress=on_clip_progress,
        cancel_check=cancel_check,
    )

if cancel_check():
    return False, "Đã hủy.", ...

if any(r is None for r in results):
    return False, "Lỗi render clip.", last_duration, last_speed

segment_paths = [r for r in results if r is not None]
```

**Ensure:** Order preserved via `results[idx]` in `ffmpeg_pool.py` (already uses `clip_index`).

**Remove** unused `TYPE_CHECKING`-only import pattern if pool now used unconditionally.

---

## Task 4: Progress under parallelism

**Verify** `RowClipProgress.display_clip_index` + existing `on_clip_progress` produce stable UI labels (same as DS004 intent).

**Test:** Extend `test_ffmpeg_pool.py` if needed — `test_render_segments_dispatches_to_pool_workers` already exists.

```bash
uv run pytest python/tests/test_ffmpeg_pool.py -q
```

---

## Task 5: Concurrency tooltip

**Files (one or both — match existing hint pattern):**

- `frontend/src/features/video-merge/video-merge-export-settings.tsx`
- `frontend/src/features/video-merge/video-merge-config-cards.tsx`

**Add** `title` / helper text near concurrency input:

> *“Số luồng ghép mix song song. Mỗi mix cũng render nhiều clip song song — tổng FFmpeg có thể ~ bình phương giá trị này. Giảm nếu máy lag.”*

---

## Task 6: Failure and order tests

**Add** `test_render_mix_row_pool_preserves_segment_order`:

- Mock `_render_segment` via pool to write distinct marker per index.
- Assert concat list order matches sequence order.

**Add** `test_render_segments_aborts_row_on_clip_failure` in `test_ffmpeg_pool.py` (may exist partially).

```bash
uv run pytest python/tests/test_ffmpeg_pool.py python/tests/test_video_merge_pipeline.py -k "pool or order" -v
```

---

## Task 7: Verification

```bash
uv run pytest python/tests/test_video_merge_pipeline.py python/tests/test_ffmpeg_pool.py python/tests/test_video_merge_job.py -q
```

**Manual:**

- [ ] 1 row, 8 clips, concurrency=4: Task Manager shows multiple `ffmpeg` during normalize
- [ ] 6 rows, concurrency=4: acceptable performance; reduce if machine swaps

---

## Deliverables

- `render_mix_row` uses per-row `FfmpegTaskPool`
- Docstrings corrected
- Settings concurrency hint
- Tests: pool wiring, order, failure

## Done

All DS005 sub-plans complete → manual benchmark RS003 §4.3 → `/ship` or PR series.
