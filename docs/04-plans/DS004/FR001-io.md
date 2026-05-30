# FR001 — Video merge `io.py`

**Parent:** DS004 | **Depends on:** — | **Blocks:** FR002, FR003  
**Design:** [DS004](../../03-design/DS004-ffmpeg-python-video-merge.md)

---

## Goal

Single module `python/services/video_merge/io.py` for folder listing, duration probe, export-settings parse, and folder/media dialogs. Unblock Video Merge page before merge job exists.

---

## Tasks

### Phase 0: Scaffold

| # | Task | Size | Depends |
|---|------|------|---------|
| 1 | Create `python/services/video_merge/__init__.py` (empty or re-exports) | S | — |
| 2 | Create stub `python/services/video_merge/io.py` with `list_videos_in_folder` raising `NotImplementedError` | S | 1 |

**Verify:** `python -c "from python.services.video_merge import io"`

---

### Phase 1: Export settings parse

| # | Task | Size | Depends |
|---|------|------|---------|
| 3 | Create `python/tests/test_video_merge_io.py` — `test_parse_export_settings_ok` (copy keys from `DEFAULT_VIDEO_EXPORT` in `settings_service.py`) | S | 2 |
| 4 | Implement `parse_export_settings(dict) -> tuple[ExportRenderConfig \| None, str \| None]` in `io.py` (dataclass or TypedDict): resolution `WxH`, fps int, zoom/speed/concurrency floats, camelCase + snake_case aliases | M | 3 |
| 5 | Add tests: invalid resolution, min>max duration → error message Vietnamese | S | 4 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_io.py::test_parse_export_settings_ok -q
```

---

### Phase 2: List videos in folder

| # | Task | Size | Depends |
|---|------|------|---------|
| 6 | Port tests from `test_video_folders.py` into `test_video_merge_io.py` (`list` empty, extensions, invalid path, empty string) | M | 2 |
| 7 | Implement `list_videos_in_folder(folder)` — return `{ok, path, message, videos[]}` with `name`, `path`, `size_bytes`, `duration_sec: None`; extensions `.mp4`, `.mov`, … per old `VIDEO_FILE_TYPES` | M | 6 |
| 8 | Implement `open_folder_in_explorer`, `open_media_file` (port from deleted `folders.py` logic) | S | 7 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_io.py -k list_videos -q
```

---

### Phase 3: Duration probe

| # | Task | Size | Depends |
|---|------|------|---------|
| 9 | Port duration tests into `test_video_merge_io.py` (mock `ffmpeg.probe` / `probe_media`) | S | 2 |
| 10 | Implement `_probe_media(path)` using `import ffmpeg` + `get_ffprobe_path()` from `plugin_downloader` | M | 9 |
| 11 | Implement `enrich_videos_with_duration(videos, max_workers=4)` — set `duration_sec`, optional `duration_ffmpeg_sec` | M | 10 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_io.py -k enrich -q
```

---

### Phase 4: Dialogs + bridge wiring

| # | Task | Size | Depends |
|---|------|------|---------|
| 12 | Port dialog helpers: `open_input_folder_dialog`, `open_output_folder_dialog`, `open_image_file_dialog`, `_resolve_initial_directory` (needs `bridge` arg) | M | 7 |
| 13 | Update `python/api/js_api.py` imports: `from python.services.video_merge.io import (...)` replace `folders` + `duration` | S | 12 |
| 14 | Fix `python/services/settings_service.py`: remove `transition_spec` import; use inline `export_settings.get("sceneTransition", "fade")` for storage only | S | 4 |

**Verify:**

```bash
uv run pytest python/tests/test_video_merge_io.py python/tests/test_settings_service.py -k video_merge -q
```

---

## Files

| Action | Path |
|--------|------|
| Create | `python/services/video_merge/__init__.py` |
| Create | `python/services/video_merge/io.py` |
| Create | `python/tests/test_video_merge_io.py` |
| Modify | `python/api/js_api.py` |
| Modify | `python/services/settings_service.py` |

**Do not delete** legacy tests yet (FR003 deletes after job works).

---

## Acceptance

- [ ] All `test_video_merge_io.py` green
- [ ] `probe_videos_in_folder` via js_api returns videos with `duration_sec` when ffprobe available
- [ ] No import of `python.services.video_merge.folders` or `.duration` anywhere

---

## Next

`/execute-plan docs/04-plans/DS004/FR002-pipeline.md`
