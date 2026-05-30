param(
    [string]$BindHost = "127.0.0.1",
    [int]$Port = 5173,
    [int]$TimeoutSeconds = 60
)

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect($BindHost, $Port)
        $client.Close()
        Write-Host "Port $Port is ready on $BindHost"
        exit 0
    } catch {
        Start-Sleep -Milliseconds 500
    }
}
Write-Error "Timeout waiting for ${BindHost}:$Port. Is Vite running? Try: yarn --cwd frontend dev"
exit 1
