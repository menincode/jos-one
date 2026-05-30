# Run Yarn 4 in frontend/ (corepack when available). Args: yarn subcommand, e.g. install, build, dev
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$YarnArgs
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $root "frontend"

Push-Location $frontendDir
try {
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        & corepack yarn @YarnArgs
    } elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
        & yarn @YarnArgs
    } else {
        & npm exec --yes yarn -- @YarnArgs
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
