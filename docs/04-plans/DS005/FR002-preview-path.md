# Plan: DS005 — FR002 Preview per-row + absolute path

**Parent:** [index.md](./index.md)  
**Design:** DS005 § PR3  
**Depends on:** FR001 recommended (same release QA)  
**Independent of:** FR003

---

## Goal

Fix “6 mix không mở được video”: absolute `outputs[].path`, strict preview gate, multi-row output before job completes.

---

## Investigation checklist (run Task 0 first)

| ID | Hypothesis | Verify | Fix task |
|----|------------|--------|----------|
| H1 | Relative path in `outputs[]` | Inspect `job.py` return `output_path` | Task 1 |
| H5 | Preview enabled on `done` without file | Unit test `canPreviewMixRow` | Task 2 |

Document confirmed hypothesis in commit message.

---

## Tasks

| # | Task | Size | Depends |
|---|------|------|---------|
| 0 | Reproduce / confirm H1 or H5 from code | S | — |
| 1 | Absolute path in `job.py` | S | 0 |
| 2 | Tighten `canPreviewMixRow` + tests | M | 0 |
| 3 | Multi-row incremental output test (Python) | M | 1 |
| 4 | Phase label cleanup (if any logo concat remnants) | S | — |
| 5 | Full FE + Python test run | S | 1–4 |

---

## Task 0: Confirm root cause

**Read:**

- `python/services/video_merge/job.py` ~301–329 (`output_path` in `_RowResult`)
- `frontend/src/features/video-merge/mix-output-path.ts`

**Expected finding:** H1 — `str(output_path)` may be relative; H5 — `canPreviewMixRow` returns true for `rowState === "done"` without checking `outputs.ok`.

---

## Task 1: Absolute path contract

**File:** `python/services/video_merge/job.py`

**Change** in `run_row` return (~304):

```python
"output_path": str(output_path.resolve()) if ok else "",
```

**Optional:** When appending to `_state["outputs"]`, same resolved string.

**Test:** Add `test_row_output_path_is_absolute`:

```python
# mock render_mix_row writes file; assert outputs[0]["path"] == str((out / "mix-r1.mp4").resolve())
```

**Command:**

```bash
uv run pytest python/tests/test_video_merge_job.py -k "output_path or success_updates" -v
```

---

## Task 2: Preview gate (frontend)

**File:** `frontend/src/features/video-merge/mix-output-path.ts`

**Replace `canPreviewMixRow` logic:**

```typescript
function hasOkOutput(rowId: string, jobOutputs: VideoMergeJobOutput[]): boolean {
  return jobOutputs.some(
    (item) =>
      item.row_id === rowId &&
      item.ok &&
      item.path.trim().length > 0,
  );
}

export function canPreviewMixRow(
  rowId: string,
  jobOutputs: VideoMergeJobOutput[],
  _rowJobStates?: Record<string, VideoMergeRowJobState>,
): boolean {
  return hasOkOutput(rowId, jobOutputs);
}
```

**Note:** Remove `_rowJobStates` usage for gating (keep param for call-site compatibility). `resolveMixPreviewPath` unchanged — already prefers `outputs[].path`.

**File:** `frontend/src/features/video-merge/mix-output-path.test.ts`

**Update tests:**

- Remove or invert: `is true when row job state is done` (empty outputs) → **false**
- Remove: `is true for done row while another mix may still be running` with empty outputs → **false**
- Add: `is true when done row has ok output in jobOutputs` (both row done + output)
- Add: `is false when row state done but output failed (ok=false)`

**Command:**

```bash
yarn --cwd frontend test mix-output-path
```

---

## Task 3: Multi-row incremental outputs

**File:** `python/tests/test_video_merge_job.py`

**Add** `test_multi_row_first_output_before_job_done`:

- 2 planned rows `r1`, `r2`.
- Mock `render_mix_row`: `r1` fast success, `r2` slow (sleep or block on event).
- Poll status while running; assert at least once:
  - `status == "running"`
  - `len(outputs) >= 1`
  - `outputs[0]["row_id"] == "r1"` and `outputs[0]["ok"]`
  - `row_states["r1"]["status"] == "done"`

**Command:**

```bash
uv run pytest python/tests/test_video_merge_job.py::test_multi_row_first_output_before_job_done -v
```

---

## Task 4: Optional JSDoc

**File:** `frontend/src/lib/pywebview/types.ts`

Add JSDoc on `VideoMergeJobOutput.path`: *“Absolute filesystem path when ok=true; used for preview.”*

---

## Task 5: Verification

```bash
uv run pytest python/tests/test_video_merge_job.py -q
yarn --cwd frontend test mix-output-path mix-row-job-status
```

**Manual UAT:**

- [ ] Start job 6 mix; when row 1 finishes, **Xem** enabled for row 1 only
- [ ] Click **Xem** → default app opens `mix-{rowId}.mp4`
- [ ] Failed row: **Xem** disabled

---

## Deliverables

- `job.py`: resolved absolute paths
- `mix-output-path.ts` + tests: strict preview gate
- `test_video_merge_job.py`: multi-row incremental output test

## Next

→ [FR003-clip-pool.md](./FR003-clip-pool.md)
