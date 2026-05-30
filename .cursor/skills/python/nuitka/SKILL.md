---
name: nuitka-build
user-invocable: true
description: >
  Compile and package Python applications with Nuitka using reproducible build
  workflows, standalone/onefile modes, package configuration, troubleshooting,
  and performance tuning. Use when users mention nuitka, standalone build,
  onefile, missing data files/DLLs, anti-bloat, or Python app distribution.
---

# Nuitka Build

## What this skill does

- Guides end-to-end Nuitka build and distribution workflows.
- Chooses correct build mode (`accelerated`, `standalone`, `onefile`) by goal.
- Handles package data, DLL dependencies, and package configuration YAML.
- Applies troubleshooting patterns for common standalone/onefile failures.
- Adds practical performance and CI guidance.

## When to use

Use this skill when the task includes:

- "Compile Python app with Nuitka"
- "Build standalone/onefile executable"
- "Missing data files or DLLs in dist"
- "Nuitka package config / anti-bloat"
- "Nuitka CI, cache, or performance tuning"

## Quick workflow

1. **Validate source app first**
   - Run normal Python execution before compiling.
2. **Use the recommended runner**
   - Prefer `python -m nuitka ...` to avoid interpreter mismatch.
3. **Start with standalone for debugging**
   - Fix missing data/DLL issues in `standalone` before moving to `onefile`.
4. **Lock packaging rules**
   - Add include rules and package config (`.nuitka-package.config.yml`) if needed.
5. **Optimize and stabilize**
   - Use cache settings, compiler choice, and CI scripts for reproducibility.

## Core guardrails

- Do not begin with `onefile` for complex apps; use `standalone` first.
- Treat missing runtime assets as packaging configuration problems, not app bugs.
- Keep build commands explicit and reproducible (version pinning + scripts).
- Use project options in source/build config to avoid command drift.
- Validate on clean target environments before release claims.

## Build mode decision

- **Default accelerated**: fastest compile path, not portable by itself.
- **`--mode=standalone`**: preferred debugging/distribution baseline.
- **`--mode=onefile`**: convenience distribution after standalone is stable.

## Common failure strategy

1. Rebuild in `--mode=standalone`.
2. Inspect missing assets:
   - package data: `--include-package-data`, `--include-data-files`, `--include-data-dir`
   - DLLs/plugins: package config YAML / plugins / include rules
3. Re-test in standalone.
4. Only then switch to `onefile`.

## Performance and CI highlights

- Prefer `python -m nuitka` consistently.
- Enable caching and keep cache location persistent in CI.
- Use compiler appropriate for platform/toolchain constraints.
- Keep smoke tests for generated artifact in CI pipeline.

## Additional resources

- Option matrix and troubleshooting map: [reference.md](reference.md)
- Ready-to-use command examples: [examples.md](examples.md)

## References

- Nuitka tutorial setup/build: <https://nuitka.net/user-documentation/tutorial-setup-and-build.html>
- Nuitka user manual: <https://nuitka.net/user-documentation/user-manual.html>
- Nuitka package config: <https://nuitka.net/user-documentation/nuitka-package-config.html>
- Common issue solutions: <https://nuitka.net/user-documentation/common-issue-solutions.html>
- Nuitka tips: <https://nuitka.net/user-documentation/tips.html>
- Nuitka performance: <https://nuitka.net/user-documentation/performance.html>
