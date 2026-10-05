<#
    Static-site deploy for TodayTask (Vite build -> FTP upload -> verify).

    This file is tracked and must never contain credentials. Create the local,
    Git-ignored deploy-single-host.ps1 from deploy-single-host.example.ps1 and
    pass all machine-specific values into this script as parameters.
#>
param(
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Server,
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Username,
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Password,
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$RemotePath,
    [string]$SiteUrl = "",
    [switch]$TrustServerCertificate,   # accept an FTPS cert that does not match the host (e.g. connecting by IP)
    [switch]$SkipBuild,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot
$distDir = Join-Path $repoRoot "dist"
if ([string]::IsNullOrWhiteSpace($SiteUrl)) { $SiteUrl = "https://$RemotePath" }
if ($TrustServerCertificate) {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
}
$credential = New-Object System.Net.NetworkCredential($Username, $Password)
$ftpRoot = "ftp://$Server/" + $RemotePath.Trim("/")

function Invoke-Ftp {
    param([string]$Url, [string]$Method, [string]$LocalFile = "")
    $req = [System.Net.FtpWebRequest]::Create($Url)
    $req.Method = $Method
    $req.Credentials = $credential
    $req.UsePassive = $true
    $req.UseBinary = $true
    $req.EnableSsl = $true
    if ($LocalFile) {
        $bytes = [System.IO.File]::ReadAllBytes($LocalFile)
        $req.ContentLength = $bytes.Length
        $stream = $req.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
    }
    $resp = $req.GetResponse()
    $resp.Close()
}

function New-RemoteDirectory {
    param([string]$Url)
    try { Invoke-Ftp -Url $Url -Method ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) }
    catch { } # already exists
}

# 1. Build
if (-not $SkipBuild) {
    Write-Host "1. Building..." -ForegroundColor Yellow
    Push-Location $repoRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    }
    finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $distDir "index.html"))) { throw "dist/index.html not found" }

# 2. Upload dist contents (not the dist folder itself) to the document root
Write-Host "2. Uploading dist/ to $ftpRoot ..." -ForegroundColor Yellow
New-RemoteDirectory -Url $ftpRoot
$files = Get-ChildItem -Path $distDir -Recurse -File -Force
# index.html + sw.js last so the app never points at assets that are not uploaded yet
$late = @("index.html", "sw.js")
$ordered = @($files | Where-Object { $late -notcontains $_.Name }) + @($files | Where-Object { $late -contains $_.Name })
$prefixLength = $distDir.Length + 1
foreach ($file in $ordered) {
    $relative = $file.FullName.Substring($prefixLength).Replace("\", "/")
    $parts = $relative.Split("/")
    $dirUrl = $ftpRoot
    for ($i = 0; $i -lt $parts.Length - 1; $i++) {
        $dirUrl += "/" + $parts[$i]
        New-RemoteDirectory -Url $dirUrl
    }
    Invoke-Ftp -Url "$ftpRoot/$relative" -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile) -LocalFile $file.FullName
    Write-Host "   $relative" -ForegroundColor Gray
}

# 3. Verify the live site
if (-not $SkipVerify) {
    Write-Host "3. Verifying $SiteUrl ..." -ForegroundColor Yellow
    Push-Location $repoRoot
    try {
        node scripts/verify-deploy.mjs $SiteUrl
        if ($LASTEXITCODE -ne 0) { throw "verify-deploy reported failures" }
    }
    finally { Pop-Location }
}

Write-Host "--- Deployment Complete! ---" -ForegroundColor Cyan
