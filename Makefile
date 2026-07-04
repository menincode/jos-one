.DEFAULT_GOAL := start

APP_NAME ?= jos-one
export APP_NAME
FRONTEND_DIR := frontend

# Tool resolution: on Windows use presence checks only (`where` paths include CR and break CreateProcess).
ifeq ($(OS),Windows_NT)
	EXE_EXT := .exe
	HAS_UV := $(shell where uv >nul 2>&1 && echo 1)
	HAS_YARN := $(shell where yarn >nul 2>&1 && echo 1)
	LOCAL_UV := $(USERPROFILE)/.local/bin/uv.exe
	ifeq ($(HAS_UV),)
		ifneq ($(wildcard $(LOCAL_UV)),)
			HAS_UV := 1
		endif
	endif
else
	EXE_EXT :=
	HAS_UV := $(shell command -v uv >/dev/null 2>&1 && echo 1)
	HAS_YARN := $(shell command -v yarn >/dev/null 2>&1 && echo 1)
endif

ifeq ($(HAS_UV),1)
	ifeq ($(OS),Windows_NT)
		ifneq ($(wildcard $(LOCAL_UV)),)
			UV := "$(LOCAL_UV)"
		else
			UV := uv
		endif
	else
		UV := uv
	endif
else ifeq ($(OS),Windows_NT)
	UV := powershell -NoProfile -ExecutionPolicy Bypass -File scripts/uv.ps1
else
	UV := MISSING_UV
endif

ifeq ($(HAS_YARN),1)
	YARN := yarn
else
	YARN := npm exec --yes yarn --
endif

ifeq ($(OS),Windows_NT)
	HAS_UPX := $(shell where upx >nul 2>&1 && echo 1)
else
	HAS_UPX := $(shell command -v upx >/dev/null 2>&1 && echo 1)
endif

UV_SYNC ?= $(UV) sync --group dev
UV_RUN ?= $(UV) run
APP_BIN := dist/$(APP_NAME)$(EXE_EXT)
ICON_ASSET := packaging/assets/josvn-icon.ico
UPX ?= upx
# PyInstaller onefile PEs have CFG (Control Flow Guard) enabled.
# --force is required to override CFG check; --lzma gives best compression.
# Signing happens before AND after UPX so SAC sees valid Authenticode on the packed binary.
UPX_FLAGS ?= --force --lzma

export APP_ENV

.PHONY: help install sync-uv deps-frontend deps-frontend-build build-icon \
	start local dev prod prod-run build package package-pyinstaller package-upx package-sign clean

help:
	@echo "Targets: install, start (default), local, dev, prod, build, package, clean"
	@echo "  build / package -> dist/$(APP_NAME)$(EXE_EXT) (PyInstaller -> sign -> UPX -> sign)"
	@echo "  Order: pyinstaller -> package-sign -> package-upx -> package-sign (SAC-safe)"
	@echo "Tools: UV=$(UV) YARN=$(YARN)"

install: sync-uv deps-frontend

sync-uv:
ifeq ($(UV),MISSING_UV)
	@echo "uv is not installed. Install: https://docs.astral.sh/uv/getting-started/installation/"
	@echo "  Windows: powershell -c \"irm https://astral.sh/uv/install.ps1 | iex\""
	@exit 1
else
	$(UV_SYNC)
endif

deps-frontend:
ifeq ($(OS),Windows_NT)
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-frontend-locks.ps1
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/yarn-frontend.ps1 install
else
	$(YARN) --cwd $(FRONTEND_DIR) install
endif

deps-frontend-build:
ifeq ($(OS),Windows_NT)
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/yarn-frontend.ps1 build
else
	$(YARN) --cwd $(FRONTEND_DIR) build
endif

# Run as module so `from python.*` resolves (repo root on sys.path). See python/tests/test_entrypoint.py
prod-run: sync-uv
ifeq ($(OS),Windows_NT)
	set APP_ENV=production&& $(UV_RUN) python -m python.main
else
	APP_ENV=production $(UV_RUN) python -m python.main
endif

start: install deps-frontend-build prod-run

prod: start

local: deps-frontend
ifeq ($(OS),Windows_NT)
	set APP_ENV=local&& powershell -NoProfile -ExecutionPolicy Bypass -File scripts/yarn-frontend.ps1 dev
else
	APP_ENV=local $(YARN) --cwd $(FRONTEND_DIR) dev
endif

ifeq ($(OS),Windows_NT)
dev: install
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev.ps1
else
dev: install
	bash scripts/dev.sh
endif

build-icon: sync-uv
	$(UV_RUN) python packaging/build_icon.py

build: package

# Build order: pyinstaller -> sign (pre-UPX, for SAC reputation) -> upx -> sign (post-UPX, final Authenticode)
package: install deps-frontend-build package-pyinstaller package-sign package-upx package-sign

package-pyinstaller: sync-uv deps-frontend-build
ifeq ($(OS),Windows_NT)
	@if not exist "$(ICON_ASSET)" (echo Missing icon: $(ICON_ASSET) && exit /b 1)
else
	@test -f "$(ICON_ASSET)" || (echo "Missing icon: $(ICON_ASSET)" && exit 1)
endif
	$(UV_RUN) pyinstaller packaging/pyinstaller.spec \
		--distpath dist --workpath build --noconfirm
ifeq ($(OS),Windows_NT)
	@if not exist "$(APP_BIN)" (echo Expected onefile: $(APP_BIN) && exit /b 1)
else
	@test -f "$(APP_BIN)" || (echo "Expected onefile: $(APP_BIN)" && exit 1)
endif

package-upx:
ifeq ($(OS),Windows_NT)
	@if not exist "$(APP_BIN)" (echo Run package-pyinstaller first - missing $(APP_BIN) && exit /b 1)
else
	@test -f "$(APP_BIN)" || (echo "Run package-pyinstaller first - missing $(APP_BIN)" && exit 1)
endif
ifneq ($(HAS_UPX),1)
	@echo UPX not on PATH - skipping compression. Install UPX 4.x or set UPX=path\to\upx.exe
else
ifeq ($(OS),Windows_NT)
	@if not exist "$(subst /,\,$(APP_BIN)).bak" copy /Y "$(subst /,\,$(APP_BIN))" "$(subst /,\,$(APP_BIN)).bak" >nul
else
	@if [ ! -f "$(APP_BIN).bak" ]; then cp "$(APP_BIN)" "$(APP_BIN).bak"; fi
endif
	$(UPX) --best $(UPX_FLAGS) "$(APP_BIN)"
	@echo "UPX packed: $(APP_BIN)"
endif

package-sign:
ifeq ($(OS),Windows_NT)
	@if not exist "$(APP_BIN)" (echo Run package-pyinstaller first - missing $(APP_BIN) && exit /b 1)
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sign-exe.ps1 -ExePath "$(APP_BIN)"
else
	@echo Code signing skipped (Windows only).
endif

ifeq ($(OS),Windows_NT)
clean:
	@if exist build rmdir /s /q build
	@if exist dist rmdir /s /q dist
	@if exist $(FRONTEND_DIR)\dist rmdir /s /q $(FRONTEND_DIR)\dist
else
clean:
	rm -rf build dist $(FRONTEND_DIR)/dist
	find python -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
endif
