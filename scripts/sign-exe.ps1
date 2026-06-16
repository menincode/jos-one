# Sign dist/*.exe with Authenticode (run AFTER PyInstaller + UPX).
# Production: set CODESIGN_PFX + CODESIGN_PFX_PASSWORD (commercial OV/EV cert).
# Dev fallback: auto-creates packaging/codesign/jos-one-codesign.pfx on first run.

param(
    [Parameter(Mandatory = $true)]
    [string]$ExePath
)

$ErrorActionPreference = "Stop"

function Resolve-SignTool {
    $cmd = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    $kitsRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
    if (Test-Path $kitsRoot) {
        $candidate = Get-ChildItem $kitsRoot -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending |
            Select-Object -First 1
        if ($candidate) {
            return $candidate.FullName
        }
    }
    return $null
}

function Read-PasswordFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return $null
    }
    $raw = (Get-Content -Path $Path -Raw).Trim()
    if (-not $raw) {
        return $null
    }
    return $raw
}

function Ensure-DevCodeSignPfx {
    param(
        [string]$CertDir,
        [string]$PfxPath,
        [string]$CerPath,
        [string]$PasswordPath
    )

    if (Test-Path $PfxPath) {
        return
    }

    New-Item -ItemType Directory -Force -Path $CertDir | Out-Null
    $password = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 24 | ForEach-Object { [char]$_ }))
    Set-Content -Path $PasswordPath -Value $password -NoNewline -Encoding UTF8

    Write-Host "Creating dev code-signing certificate (JOS Co., Ltd)..."
    $cert = New-SelfSignedCertificate `
        -Subject "CN=JOS Co., Ltd, O=JOS Co., Ltd, C=VN" `
        -Type CodeSigning `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyExportPolicy Exportable `
        -KeyUsage DigitalSignature `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddYears(5)

    $secure = ConvertTo-SecureString -String $password -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $secure | Out-Null
    Export-Certificate -Cert $cert -FilePath $CerPath -Type CERT | Out-Null
    Write-Host "Dev cert exported: $PfxPath"
    Write-Host "Trust on target PCs: scripts/trust-dev-codesign-cert.ps1 (Admin) or use a commercial OV/EV cert."
}

function Sign-WithPfx {
    param(
        [string]$Path,
        [string]$PfxPath,
        [string]$Password
    )

    $signTool = Resolve-SignTool
    $timestamp = "http://timestamp.digicert.com"

    if ($signTool) {
        & $signTool sign /fd sha256 /f $PfxPath /p $Password /tr $timestamp /td sha256 $Path
        if ($LASTEXITCODE -ne 0) {
            throw "signtool failed with exit code $LASTEXITCODE"
        }
        return
    }

    $secure = ConvertTo-SecureString -String $Password -Force -AsPlainText
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($PfxPath, $secure)
    $result = Set-AuthenticodeSignature `
        -FilePath $Path `
        -Certificate $cert `
        -TimestampServer $timestamp `
        -HashAlgorithm SHA256
    if ($result.Status -ne "Valid" -and $result.Status -ne "UnknownError") {
        throw "Set-AuthenticodeSignature status: $($result.Status)"
    }
}

if (-not (Test-Path $ExePath)) {
    throw "Executable not found: $ExePath"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$certDir = Join-Path $repoRoot "packaging\codesign"
$pfxPath = if ($env:CODESIGN_PFX) { $env:CODESIGN_PFX } else { Join-Path $certDir "jos-one-codesign.pfx" }
$cerPath = Join-Path $certDir "jos-one-codesign.cer"
$passwordPath = Join-Path $certDir ".pfx-password"

if ($env:CODESIGN_SKIP -eq "1") {
    Write-Host "CODESIGN_SKIP=1 - skipping Authenticode signing."
    exit 0
}

if ($env:CODESIGN_THUMBPRINT) {
    $cert = Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My |
        Where-Object { $_.Thumbprint -eq $env:CODESIGN_THUMBPRINT } |
        Select-Object -First 1
    if (-not $cert) {
        throw "Certificate thumbprint not found: $($env:CODESIGN_THUMBPRINT)"
    }
    $result = Set-AuthenticodeSignature `
        -FilePath $ExePath `
        -Certificate $cert `
        -TimestampServer "http://timestamp.digicert.com" `
        -HashAlgorithm SHA256
    if ($result.Status -ne "Valid" -and $result.Status -ne "UnknownError") {
        throw "Set-AuthenticodeSignature status: $($result.Status)"
    }
}
else {
    if (-not (Test-Path $pfxPath)) {
        if ($env:CODESIGN_PFX) {
            throw "CODESIGN_PFX not found: $pfxPath"
        }
        Ensure-DevCodeSignPfx -CertDir $certDir -PfxPath $pfxPath -CerPath $cerPath -PasswordPath $passwordPath
    }

    $password = $env:CODESIGN_PFX_PASSWORD
    if (-not $password) {
        $password = Read-PasswordFile -Path $passwordPath
    }
    if (-not $password) {
        throw "Missing CODESIGN_PFX_PASSWORD or $passwordPath"
    }

    Sign-WithPfx -Path $ExePath -PfxPath $pfxPath -Password $password
}

$signature = Get-AuthenticodeSignature -FilePath $ExePath
Write-Host "Signed: $ExePath"
Write-Host "Publisher: $($signature.SignerCertificate.Subject)"
Write-Host "Signature status: $($signature.Status)"

if ($signature.Status -eq "UnknownError") {
    Write-Warning "Self-signed dev cert: trust packaging/codesign/jos-one-codesign.cer on user PCs, or use a commercial code-signing certificate for public release."
}
