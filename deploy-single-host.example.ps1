<#
    Copy this file to deploy-single-host.ps1 and fill in the values for your
    FTP account. deploy-single-host.ps1 is Git-ignored; never put real
    credentials in this example file.
#>
param(
    [string]$Server     = "ftp.example.com",
    [string]$Username   = "ftp-user",
    [string]$Password   = "CHANGE_ME",
    [string]$RemotePath = "drivetodev.online/todaytask", # โฟลเดอร์ todaytask ใน document root ของโดเมนหลัก (ตรวจ path FTP จริงก่อนรัน)
    [string]$SiteUrl    = "https://drivetodev.online/todaytask/"
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\deploy-single-host.core.ps1" -Server $Server -Username $Username -Password $Password -RemotePath $RemotePath -SiteUrl $SiteUrl
