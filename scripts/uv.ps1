# Resolve or install uv, then run: scripts/uv.ps1 sync --group dev | run python -m python.main
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$UvArgs
)

$ErrorActionPreference = "Stop"

function Get-UvExecutable {
    $cmd = Get-Command uv -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $local = Join-Path $env:USERPROFILE ".local\bin\uv.exe"
    if (Test-Path $local) {
        return $local
    }

    Write-Host "uv not found. Installing via Astral installer..."
    $installScript = Invoke-RestMethod -Uri "https://astral.sh/uv/install.ps1"
    Invoke-Expression $installScript

    if (Test-Path $local) {
        $binDir = Split-Path $local -Parent
        if ($env:PATH -notlike "*$binDir*") {
            $env:PATH = "$binDir;$env:PATH"
        }
        return $local
    }

    throw "uv install finished but $local was not found. Restart the terminal and run make dev again."
}

$uvExe = Get-UvExecutable
& $uvExe @UvArgs
exit $LASTEXITCODE
