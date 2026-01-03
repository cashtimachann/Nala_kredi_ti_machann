$body = @{ email = 'cashier@nalacredit.com'; password = 'Jesus123@@' } | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Method Post -Uri 'http://localhost:5000/api/auth/login' -ContentType 'application/json' -Body $body -ErrorAction Stop
    $response.StatusCode
    $response.Content
} catch {
    $_.Exception.Response | ForEach-Object {
        $_ | Format-List StatusCode, StatusDescription
        $stream = $_.GetResponseStream()
        if ($stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            $content
        }
    }
    throw
}
