# Windows dev: Vite (5173) + pywebview (APP_ENV=development). No GNU Make/bash required.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Uv {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    $uvScript = Join-Path $PSScriptRoot "uv.ps1"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $uvScript @Args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

function Invoke-YarnFrontend {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "yarn-frontend.ps1") @Args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:APP_ENV = "development"

Invoke-Uv sync --group dev
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "stop-frontend-locks.ps1")
Invoke-YarnFrontend install

$frontendDir = Join-Path $root "frontend"
$viteLog = Join-Path $root "frontend-dev.log"
if (Test-Path $viteLog) { Remove-Item $viteLog -Force }

function Start-ViteDevServer {
    $yarnScript = Join-Path $PSScriptRoot "yarn-frontend.ps1"
    $command = "& '$yarnScript' dev *> '$viteLog'"
    return Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
        -WorkingDirectory $frontendDir -PassThru -WindowStyle Hidden
}

$vite = Start-ViteDevServer

try {
    & powershell -NoProfile -File (Join-Path $PSScriptRoot "wait-port.ps1") -Port 5173
    Invoke-Uv run python -m python.main
} catch {
    if ($vite.HasExited) {
        Write-Host "Vite exited early (code $($vite.ExitCode)). Log: $viteLog"
        if (Test-Path $viteLog) { Get-Content $viteLog -Tail 40 }
    }
    throw
} finally {
    if ($vite -and -not $vite.HasExited) {
        Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue
    }
}
