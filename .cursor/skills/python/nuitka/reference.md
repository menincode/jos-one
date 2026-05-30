# Nuitka Reference

## Capability map

| Need | Nuitka capability | Notes |
|---|---|---|
| Compile a Python app | `python -m nuitka app.py` | Use same interpreter that runs app |
| Portable distribution | `--mode=standalone` | Best first target for debugging packaging |
| Single binary delivery | `--mode=onefile` | Use after standalone is stable |
| Include package data | `--include-package-data=PKG` | Preferred for package-owned data |
| Include arbitrary data files | `--include-data-files`, `--include-data-dir` | Use for app-level resources |
| Tune dependency graph | anti-bloat / noinclude modes | Control dependency creep |
| Handle package quirks | package config YAML | Add rules for data files, DLLs, conditions |

## Recommended decision flow

1. Confirm source app works with normal Python.
2. Compile in `standalone`.
3. Fix missing data/DLL via include options and/or package config.
4. Re-test on clean machine/container.
5. Move to `onefile` only after standalone passes.

## Key packaging options

- `--include-package-data=package_name[:pattern]`
- `--include-data-files=src=dest`
- `--include-data-dir=src_dir=dest_dir`
- `--include-onefile-external-data=PATTERN`
- `--output-dir=dist`
- `--report=build-report.xml` (or selected report format by version)

## Project options pattern

Prefer storing build flags near code via Nuitka project options comments.
Useful for:

- OS-specific branches
- app metadata (version/product fields)
- persistent include rules and package config path

## Package config YAML notes

Package config helps solve package-specific build issues:

- `module-name` as primary selector
- sections like `data-files`, `dlls`, `anti-bloat`
- `when` expressions for platform/version conditions
- `find-dlls-near-module` for adjacent runtime dependencies

Keep custom package config versioned in repo.

## Common issue map

- **Works in Python, fails in standalone**: likely missing data files/DLLs.
- **Onefile failure only**: verify path usage (`__file__` vs `sys.argv[0]` semantics).
- **No error output in Windows GUI mode**: re-enable console or force stdout/stderr specs.
- **Huge dist size**: use anti-bloat and noinclude controls.
- **Compiler memory/resource errors**: try alternate compiler strategy for platform.

## CI and cache strategy

- Run `python -m nuitka` in CI, not bare `nuitka`.
- Keep cache persistent where possible.
- Consider environment controls for cache directories in ephemeral runners.
- Add artifact smoke tests (startup + critical command).

## Performance notes

- Benchmark only stable, release-like builds.
- Consider LTO/PGO when appropriate to your workload.
- Validate performance against uncompiled baseline with repeatable runs.

## Release checklist

- [ ] Source tests pass.
- [ ] Standalone build passes smoke/integration tests.
- [ ] Onefile build validated (if used).
- [ ] Data files/DLL dependencies explicitly covered.
- [ ] Build command/config committed and reproducible.
- [ ] Clean-machine test completed.
