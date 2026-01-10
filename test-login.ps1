# Test login pour différents comptes
param(
    [string]$Email = "melissa.jean@gmail.com",
    [string]$Password = "Jesus123!!",
    [string]$BaseUrl = "https://admin.nalakreditimachann.com/api"
)

Write-Host "🔐 Testing login for: $Email" -ForegroundColor Cyan
Write-Host "🌐 API URL: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

$body = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "User Info:" -ForegroundColor Yellow
    Write-Host "  Name: $($response.user.firstName) $($response.user.lastName)"
    Write-Host "  Email: $($response.user.email)"
    Write-Host "  Role: $($response.user.role)"
    Write-Host "  Branch ID: $($response.user.branchId)"
    Write-Host "  Branch Name: $($response.user.branchName)"
    Write-Host "  Is Active: $($response.user.isActive)"
    Write-Host ""
    Write-Host "Token (first 50 chars): $($response.token.Substring(0, [Math]::Min(50, $response.token.Length)))..."
}
catch {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMsg = $_.Exception.Message
    Write-Host "  Status: $statusCode"
    Write-Host "  Message: $errorMsg"
    
    if ($_.ErrorDetails) {
        $errDetails = $_.ErrorDetails.Message
        Write-Host "  Response: $errDetails"
    }
}