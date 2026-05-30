# Plan: DS005 — FR001 Logo at normalize + concat copy

**Parent:** [index.md](./index.md)  
**Design:** DS005 § PR1  
**Depends on:** None  
**Required for:** FR002, FR003

---

## Goal

Burn logo on every clip during `_render_segment`; remove full-timeline re-encode from `_concat_segments`.

---

## Tasks

| # | Task | Size | Depends |
|---|------|------|---------|
| 1 | Add failing tests for logo segment + copy-only concat | M | — |
| 2 | Implement logo overlay in `_render_segment` | L | 1 |
| 3 | Simplify `_concat_segments` to copy-only | M | 1 |
| 4 | Update `render_mix_row` concat call + labels | S | 2, 3 |
| 5 | Frontend: remove concat “(thêm logo)” suffix | S | 4 |
| 6 | Run pytest + fix regressions | M | 2–5 |

---

## Task 1: Failing tests

**Files:**

- Modify: `python/tests/test_video_merge_pipeline.py`

**Add tests:**

1. `test_render_segment_includes_logo_overlay_when_logo_configured`
   - Create temp logo PNG (minimal bytes or copy fixture).
   - `ExportRenderConfig` with `logo_path=<file>`, `logo_position="bottom_right"`.
   - Patch `_run_ffmpeg`; capture `cmd`.
   - Assert: two `-i` inputs (clip + logo), `-filter_complex` contains `overlay=`, `format=rgba`.

2. `test_render_segment_skips_logo_when_file_missing`
   - `logo_path="/nonexistent/logo.png"`.
   - Assert: single `-i`, no `overlay=`.

3. `test_concat_segments_copy_only_even_with_logo_param_removed`
   - After FR001, `_concat_segments` signature drops logo kwargs.
   - Assert cmd contains `-c copy`, `-f concat`, **no** second `-i`, **no** `libx264`/`nvenc`.

**Test:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py -k "logo or concat_segments" -v
```

**Acceptance:** New tests **fail** on current code.

---

## Task 2: Logo in `_render_segment`

**File:** `python/services/video_merge/pipeline.py`

**Changes:**

1. After building `vfilter` / `vchain`, check:
   ```python
   logo = config.logo_path
   use_logo = bool(logo and Path(logo).is_file())
   ```

2. **With logo:**
   - Inputs: `-i str(src)`, `-i logo` (add logo as second input).
   - Video filter:
     ```text
     [0:v]{vfilter}[vnorm];[1:v]format=rgba[logo];[vnorm][logo]overlay={pos}[vout]
     ```
     where `pos = _LOGO_OVERLAY.get(config.logo_position, _LOGO_OVERLAY["bottom_right"])`.
   - Audio: keep existing `achain` / `-an` logic unchanged.
   - Maps: `-map [vout]` + audio map if has_audio.

3. **Without logo:** keep current single-input `build_cmd`.

4. Do **not** change `_video_codec_args` / NVENC fallback.

**Test:** Task 1 logo tests pass.

---

## Task 3: `_concat_segments` copy-only

**File:** `python/services/video_merge/pipeline.py`

**Changes:**

1. Remove params `logo_path`, `logo_position`.
2. Remove `build_logo_cmd` branch (~735–761).
3. Keep single path:
   ```python
   cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", str(output_path)]
   ```
4. Remove NVENC fallback block tied to logo concat (~791+ if present).

**Update callers:** `render_mix_row` — drop `logo_path=` / `logo_position=` kwargs.

**Test:**

```bash
uv run pytest python/tests/test_video_merge_pipeline.py::test_concat_segments_uses_concat_demuxer -v
```

---

## Task 4: `render_mix_row` labels

**File:** `python/services/video_merge/pipeline.py`

**Changes:**

- Replace conditional `join_label`:
  ```python
  join_label = "Nối video"
  ```
- Remove `logo_path` param from `render_mix_row` **only if** unused elsewhere — today passed from `job.py`; either keep param ignored or remove from signature + `job.py` call (minimal: keep param for API stability but unused, or remove both — prefer remove if tests allow).

**Check:** `python/services/video_merge/job.py` call site ~279–287.

**Test:** `test_render_mix_row_passes_row_id_to_segment_tasks` still passes.

---

## Task 5: Frontend phase label

**Files:**

- `frontend/src/features/video-merge/mix-row-pipeline-phase.ts`
- `frontend/src/features/video-merge/mix-row-pipeline-phase.test.ts` (if exists; else add case in nearest test file)

**Changes:**

- Remove block:
  ```typescript
  if (phase === "concat" && /logo/i.test(trimmed)) {
    return `${base} (thêm logo)`;
  }
  ```

**Test:**

```bash
yarn --cwd frontend test mix-row-pipeline-phase
```

---

## Task 6: Full verification

```bash
uv run pytest python/tests/test_video_merge_pipeline.py -q
yarn --cwd frontend test mix-row-pipeline-phase
```

**Acceptance (DS005 PR1):**

- [ ] Concat never re-encodes when logo enabled in settings
- [ ] Segment cmd includes overlay when logo file exists
- [ ] No-logo jobs unchanged

---

## Deliverables

- `pipeline.py`: logo at normalize, concat copy only
- `test_video_merge_pipeline.py`: logo + concat regression tests
- `mix-row-pipeline-phase.ts`: concat label without logo suffix

## Next

→ [FR002-preview-path.md](./FR002-preview-path.md)
