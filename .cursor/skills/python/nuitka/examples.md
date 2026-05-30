# Nuitka Examples

## 1) Baseline compile

```bash
python -m pip install nuitka
python -m nuitka --version
python -m nuitka app.py
```

Use this only after `python app.py` is already working.

## 2) Standalone distribution-first workflow

```bash
python -m nuitka --mode=standalone --output-dir=build app.py
```

Run executable from generated distribution folder and validate critical flows.

## 3) Onefile workflow (after standalone is stable)

```bash
python -m nuitka --mode=onefile --output-dir=build app.py
```

Do not skip standalone validation for non-trivial apps.

## 4) Include package data

```bash
python -m nuitka \
  --mode=standalone \
  --include-package-data=my_package \
  app.py
```

Or include patterns:

```bash
python -m nuitka \
  --mode=standalone \
  --include-package-data=my_package:*.json \
  app.py
```

## 5) Include app-level resource files

```bash
python -m nuitka \
  --mode=standalone \
  --include-data-files=assets/logo.png=assets/logo.png \
  app.py
```

Include a whole data directory:

```bash
python -m nuitka \
  --mode=standalone \
  --include-data-dir=assets=assets \
  app.py
```

## 6) Use custom package config YAML

```bash
python -m nuitka \
  --mode=standalone \
  --user-package-configuration-file=./user.nuitka-package.config.yml \
  app.py
```

Use this for package-specific DLL/data/anti-bloat rules.

## 7) Basic anti-bloat control

```bash
python -m nuitka \
  --mode=standalone \
  --noinclude-pytest-mode=nofollow \
  --noinclude-setuptools-mode=nofollow \
  app.py
```

Use when standalone output pulls unwanted dependency trees.

## 8) Windows icon metadata (example)

```bash
python -m nuitka \
  --mode=onefile \
  --windows-icon-from-ico=app.ico \
  app.py
```

## 9) Build report output

```bash
python -m nuitka \
  --mode=standalone \
  --report=build-report.xml \
  app.py
```

Use reports to inspect dependency and inclusion outcomes.

## 10) CI smoke pipeline example

```bash
python -m pip install nuitka
python -m nuitka --mode=standalone --output-dir=build app.py
./build/app.dist/app --help
```

Adjust executable path for your platform.

## 11) Caching in CI (environment example)

```bash
export NUITKA_CACHE_DIR=/ci-cache/nuitka
python -m nuitka --mode=standalone app.py
```

Use persistent cache to reduce repeat build times.

## 12) Performance trial (example)

```bash
python -m nuitka --lto=yes --pgo app.py
```

Benchmark against uncompiled baseline before adopting flags globally.

## 13) Standalone first, then onefile (recommended sequence)

```bash
# Step 1: validate standalone
python -m nuitka --mode=standalone --output-dir=build app.py

# Step 2: after standalone is stable, create onefile
python -m nuitka --mode=onefile --output-dir=build app.py
```

Use this sequence to diagnose missing files faster.

## 14) Include onefile external data near executable

```bash
python -m nuitka \
  --mode=onefile \
  --include-data-files=config/default.json=config/default.json \
  --include-onefile-external-data=config/*.json \
  app.py
```

Use when some data should live next to onefile binary, not inside extraction dir.

## 15) Exclude unwanted data files

```bash
python -m nuitka \
  --mode=standalone \
  --include-data-dir=assets=assets \
  --noinclude-data-files=assets/**/*.psd \
  app.py
```

Helpful when bundling large design/raw files by mistake.

## 16) Recursive data-file pattern mapping

```bash
python -m nuitka \
  --mode=standalone \
  --include-data-files=resources=data=**/*.json \
  app.py
```

Keeps directory structure while including only matching files.

## 17) Project-options-in-source pattern

```python
# nuitka-project-if: {OS} == "Windows":
#    nuitka-project: --mode=onefile
# nuitka-project-else:
#    nuitka-project: --mode=standalone
# nuitka-project: --include-package-data=my_package
```

Use to keep build options close to source and avoid CI/local drift.

## 18) User package configuration with conditional rules

```yaml
- module-name: "tkinterweb"
  data-files:
    - dirs:
        - "tkhtml"
      when: "win32"
  dlls:
    - from_filenames:
        relative_path: "dlls"
        prefixes:
          - "tk"
      when: "win32 and arch_amd64"
```

Use YAML rules for package-specific data and DLL handling.

## 19) Dependency creep reduction with custom noinclude mode

```bash
python -m nuitka \
  --mode=standalone \
  --noinclude-pytest-mode=nofollow \
  --noinclude-setuptools-mode=nofollow \
  --noinclude-custom-mode=setuptools:error \
  app.py
```

Makes builds fail fast when forbidden deps are pulled.

## 20) Windows no-console debugging output capture

```bash
python -m nuitka \
  --mode=onefile \
  --windows-console-mode=disable \
  --force-stdout-spec=build/stdout.txt \
  --force-stderr-spec=build/stderr.txt \
  app.py
```

Use for GUI apps where traceback is otherwise invisible.

## 21) Windows UAC request example

```bash
python -m nuitka \
  --mode=onefile \
  --windows-uac-admin \
  app.py
```

Only use when elevation is genuinely required.

## 22) Windows splash screen (onefile)

```bash
python -m nuitka \
  --mode=onefile \
  --onefile-windows-splash-screen-image=assets/Splash-Screen.png \
  app.py
```

Useful for slow-starting onefile applications.

## 23) macOS app bundle icon example

```bash
python -m nuitka \
  --mode=standalone \
  --macos-create-app-bundle \
  --macos-app-icon=assets/app.icns \
  app.py
```

Use bundle mode when distributing a native-like macOS app artifact.

## 24) Compiler choice fallback example

```bash
# Linux fallback when GCC has issues
python -m nuitka --mode=standalone --clang app.py
```

Useful when facing compiler memory/compatibility issues.

## 25) Cache binary override in CI

```bash
export NUITKA_CCACHE_BINARY=/usr/bin/ccache
export NUITKA_CACHE_DIR=/ci-cache/nuitka
python -m nuitka --mode=standalone app.py
```

Makes cache behavior explicit in non-standard environments.

## 26) Build with explicit output directory and report

```bash
python -m nuitka \
  --mode=standalone \
  --output-dir=build/nuitka \
  --report=build/nuitka/compilation-report.xml \
  app.py
```

Good baseline for traceable CI artifacts.

## 27) Runtime path usage guideline for onefile vs standalone

```python
from pathlib import Path
import sys

# Near executable (works for standalone, and for onefile launcher location)
exe_dir = Path(sys.argv[0]).resolve().parent

# Inside deployed bundle/extracted location
bundle_dir = Path(__file__).resolve().parent
```

Use this pattern to avoid path bugs when switching to onefile.

## 28) Simple benchmark loop for before/after comparison

```bash
# Uncompiled baseline
for i in {1..20}; do python app.py --bench; done

# Compiled candidate
python -m nuitka --lto=yes --pgo app.py
for i in {1..20}; do ./app.bin --bench; done
```

Keep the same workload and environment when comparing results.
