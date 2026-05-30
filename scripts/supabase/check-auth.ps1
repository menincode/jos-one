# Verify Supabase Auth config and optional test login (reads frontend/.env).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile = Join-Path $root "frontend\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "Missing frontend/.env - copy from frontend/.env.example"
}

function Get-EnvValue([string]$name) {
    $line = Get-Content $envFile | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -replace "^$name=", "").Trim()
}

$url = (Get-EnvValue "VITE_SUPABASE_URL").TrimEnd("/")
$key = Get-EnvValue "VITE_SUPABASE_ANON_KEY"
$testEmail = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { "dev.jos.desktop@gmail.com" }
$testPassword = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { "DevTest123!" }

Write-Host "Project URL: $url"
Write-Host "Key prefix:   $($key.Substring(0, [Math]::Min(20, $key.Length)))..."

$headers = @{
    apikey         = $key
    Authorization  = "Bearer $key"
    "Content-Type" = "application/json"
}
$body = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress

Write-Host ""
Write-Host "--- token?grant_type=password ---"
try {
    $response = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/token?grant_type=password" -Headers $headers -Body $body
    Write-Host "OK: access_token received (length $($response.access_token.Length))"
    $response | ConvertTo-Json -Depth 2
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errBody = $reader.ReadToEnd()
    Write-Host "HTTP: $status"
    Write-Host $errBody
}

Write-Host ""
Write-Host 'Tip: invalid_credentials means no user or wrong password.'
