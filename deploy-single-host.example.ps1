<#
    Copy this file to deploy-single-host.ps1 and fill in the values for your
    FTP account. deploy-single-host.ps1 is Git-ignored; never put real
    credentials in this example file.
#>
param(
    [string]$Server     = "ftp.example.com",
    [string]$Username   = "ftp-user",
    [string]$Password   = "CHANGE_ME",
    [string]$RemotePath = "todaytask.drivetodev.online"
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\deploy-single-host.core.ps1" -Server $Server -Username $Username -Password $Password -RemotePath $RemotePath
