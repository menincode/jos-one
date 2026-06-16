# Install dev code-signing public cert to Trusted Root + Trusted Publisher (requires Admin).
# Run once per PC that should trust locally signed jos-one.exe builds.

$ErrorActionPreference = "Stop"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script in an elevated (Administrator) PowerShell session."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$cerPath = Join-Path $repoRoot "packaging\codesign\jos-one-codesign.cer"

if (-not (Test-Path $cerPath)) {
    throw "Missing $cerPath - run make package once to generate the dev certificate."
}

$rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
$rootStore.Open("ReadWrite")
$pubStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "LocalMachine")
$pubStore.Open("ReadWrite")

try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cerPath)
    $rootStore.Add($cert)
    $pubStore.Add($cert)
    Write-Host "Trusted dev publisher: $($cert.Subject)"
}
finally {
    $rootStore.Close()
    $pubStore.Close()
}
