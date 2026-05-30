# Stop stale Vite/esbuild processes that lock frontend\node_modules\@esbuild\...\esbuild.exe
# (Windows EPERM on `yarn install` when a previous dev session is still running.)
$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $root "frontend"
$esbuild = Join-Path $frontendDir "node_modules\@esbuild\win32-x64\esbuild.exe"

if (-not (Test-Path $esbuild)) {
    exit 0
}

$esbuildFull = (Resolve-Path $esbuild).Path

Get-Process -Name esbuild -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $esbuildFull } |
    ForEach-Object {
        Write-Host "Stopping stale esbuild (PID $($_.Id)) blocking yarn install..."
        Stop-Process -Id $_.Id -Force
    }

# Vite dev on 5173 often keeps esbuild alive via node.
$vitePort = 5173
$connections = Get-NetTCPConnection -LocalPort $vitePort -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "node") {
        Write-Host "Stopping node on port $vitePort (PID $($proc.Id))..."
        Stop-Process -Id $proc.Id -Force
    }
}

exit 0
