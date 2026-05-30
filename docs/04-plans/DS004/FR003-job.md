# FR003 — Video merge `job.py` + integration

**Parent:** DS004 | **Depends on:** FR001, FR002 | **Blocks:** —  
**Design:** [DS004](../../03-design/DS004-ffmpeg-python-video-merge.md)

---

## Goal

`job.py`: background thread, global state, start/status/cancel, `row_states` for Mix table, subprocess kill on cancel/app exit. Wire `js_api` (already imports job — update if paths change). Delete legacy tests.

---

## Tasks

### Phase 1: Job state skeleton

| # | Task | Size | Depends |
|---|------|------|---------|
| 1 | Create `python/tests/test_video_merge_job.py` — reset state fixture; `get_video_merge_job_status` idle defaults | S | FR002 |
| 2 | Create `job.py` with `_state` dict, `_lock`, `get_video_merge_job_status()`, `_update_row_state(row_id, **kwargs)` | M | 1 |
| 3 | Test `_update_row_state` preserves `output_duration_sec` / `output_speed_x` across message updates | S | 2 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_job.py -k update_row -q
```

---

### Phase 2: Cancel + subprocess registry

| # | Task | Size | Depends |
|---|------|------|---------|
| 4 | Module-level `_active_procs: list[Popen]` + `register_proc` / `kill_all_procs` / `clear_cancel_flag` / `is_cancelled` | M | 2 |
| 5 | Wire `pipeline._run_ffmpeg` to register Popen with job module (callback or shared `cancel.py` pattern inlined in `job.py` per DS004) | M | 4 |
| 6 | Implement `request_cancel_video_merge()` — set cancelled, kill procs, mark pending/running rows `cancelled` | M | 5 |
| 7 | Port cancel test from `test_video_merge_job.py` / `test_merge_cancel.py` | S | 6 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_job.py -k cancel -q
```

---

### Phase 3: Start job worker

| # | Task | Size | Depends |
|---|------|------|---------|
| 8 | Implement `start_video_merge_job(...)` — validate folders, parse settings via `io.parse_export_settings`, return `{ok: false}` if busy | M | 6 |
| 9 | List videos: `io.list_videos_in_folder` + enrich; run `pipeline.plan_mix_rows`; on fail → `status=error` | M | 8 |
| 10 | Compute `total` = sum of `len(sequence_paths)`; spawn daemon thread `_run_job(...)` | M | 9 |
| 11 | In `_run_job`: per row sequential — temp `{output}/.jos-merge/{job_id}/row_{id}/`; call `render_mix_row` with progress callback updating `row_states` + `progress` | L | 10 |
| 12 | Message templates per DS004: `Clip {i}/{n}: …`, done `Thời lượng xuất (FFmpeg): {sec}s · speed {x}x` | S | 11 |
| 13 | Job aggregate: ≥1 row ok → `done` + message `Hoàn tất X/Y mix`; all fail → `error`; cleanup temp tree in `finally` | M | 11 |
| 14 | `outputs[]` append per row: `{row_id, ok, path, message, output_duration_sec, output_speed_x}` | S | 11 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_job.py -k "start or progress" -q
```

(mock `render_mix_row` / `plan_mix_rows`)

---

### Phase 4: Shutdown + bridge

| # | Task | Size | Depends |
|---|------|------|---------|
| 15 | Implement `shutdown_video_merge_on_app_exit()` — cancel running job, kill procs | S | 6 |
| 16 | Update `python/tests/test_app_shutdown.py` imports for new `job` module | S | 15 |
| 17 | Confirm `python/api/js_api.py` imports from `video_merge.job` and `video_merge.io` only | S | FR001 |

**Verify:**

```bash
uv run pytest python/tests/test_app_shutdown.py python/tests/test_video_merge_job.py -q
```

---

### Phase 5: Legacy test cleanup

| # | Task | Size | Depends |
|---|------|------|---------|
| 18 | Delete legacy test files listed in [index.md](./index.md) | S | 17 |
| 19 | Full suite: `uv run pytest python/tests/test_video_merge_io.py python/tests/test_video_merge_pipeline.py python/tests/test_video_merge_job.py -q` | S | 18 |

---

### Phase 6: Manual smoke

| # | Task | Size | Depends |
|---|------|------|---------|
| 20 | Run desktop app; FFmpeg plugins ready; Start merge with 1 row, 2 leading clips; verify `mix-*.mp4` and Mix table Xuất/Speed | M | 19 |
| 21 | Test Cancel mid-job; verify `cancelled` status | S | 20 |

---

## `row_states` contract (implementation checklist)

| Field | When set |
|-------|----------|
| `status` | pending → running → done/error/cancelled |
| `message` | Each clip + join; matches DS004 table |
| `output_duration_sec` | From pipeline stderr parse each progress tick |
| `output_speed_x` | From pipeline stderr parse each progress tick |

---

## Files

| Action | Path |
|--------|------|
| Create | `python/services/video_merge/job.py` |
| Create | `python/tests/test_video_merge_job.py` |
| Modify | `python/tests/test_app_shutdown.py` |
| Delete | 15 legacy `python/tests/test_*` files (see index) |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Windows file lock on temp delete | Kill FFmpeg before `shutil.rmtree` |
| `-c copy` concat fails (param drift) | Segments normalized in `_render_segment`; fallback re-encode concat |
| Job re-entry | `start` returns `ok: false` if `status == running` |

---

## Acceptance

- [x] All 3 `test_video_merge_*` modules green
- [x] `test_app_shutdown` green
- [x] Automated smoke (`test_video_merge_integration.py` tasks 20–21); desktop UI optional
- [x] No remaining imports of deleted `video_merge.folders`, `.planner`, etc.

---

## Next steps

- `/review` optional on implemented code
- Update `CONTEXT/progress-tracker.md` if team tracks milestones
