# Test public.users login via RPC or table (reads frontend/.env).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $root "frontend\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "Missing frontend/.env"
}

function Get-EnvValue([string]$name) {
    $line = Get-Content $envFile | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -replace "^$name=", "").Trim()
}

$url = (Get-EnvValue "VITE_SUPABASE_URL").TrimEnd("/")
$key = Get-EnvValue "VITE_SUPABASE_ANON_KEY"
$username = if ($env:TEST_USERNAME) { $env:TEST_USERNAME } else { "test" }
$password = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { "123456" }

$headers = @{
    apikey         = $key
    Authorization  = "Bearer $key"
    "Content-Type" = "application/json"
    Prefer         = "return=representation"
}

Write-Host "RPC login for user: $username"
$rpcBody = @{ p_username = $username; p_password = $password } | ConvertTo-Json -Compress
try {
    $rpc = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/login" -Headers $headers -Body $rpcBody
    if ($rpc) {
        Write-Host "OK (RPC):" ($rpc | ConvertTo-Json -Compress)
        exit 0
    }
    Write-Host "RPC returned null - wrong credentials or function missing"
} catch {
    Write-Host "RPC failed:" $_.Exception.Message
}

Write-Host ""
Write-Host "Table fallback (needs SELECT policy on users):"
$encUser = [uri]::EscapeDataString($username)
$encPass = [uri]::EscapeDataString($password)
try {
    $rows = Invoke-RestMethod -Method Get -Uri "$url/rest/v1/users?username=eq.$encUser&password=eq.$encPass&status=eq.true&select=id,username,role,status" -Headers $headers
    if ($rows -and $rows.Count -gt 0) {
        Write-Host "OK (table):" ($rows[0] | ConvertTo-Json -Compress)
        exit 0
    }
    Write-Host "No matching active user"
    exit 1
} catch {
    Write-Host "Table query failed:" $_.Exception.Message
    Write-Host "Run scripts/supabase/users-login-rpc.sql in SQL Editor"
    exit 1
}
