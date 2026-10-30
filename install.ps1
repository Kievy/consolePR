# Installs ConsolePR for the current user. Restart Premiere afterwards.
# The extension is unsigned, so CEP debug mode must be on for Premiere to load it.
$ErrorActionPreference = "Stop"

$source = Join-Path $PSScriptRoot "extension"
$target = Join-Path $env:APPDATA "Adobe\CEP\extensions\com.consolepr"

if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
}
New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
Copy-Item $source $target -Recurse

foreach ($version in 9..22) {
    $key = "HKCU:\Software\Adobe\CSXS.$version"
    if (-not (Test-Path $key)) {
        New-Item -Path $key -Force | Out-Null
    }
    if ((Get-ItemProperty $key).PlayerDebugMode -ne "1") {
        Set-ItemProperty -Path $key -Name PlayerDebugMode -Value "1"
    }
}

Write-Host "ConsolePR instalado em $target"
Write-Host "Reinicie o Premiere e use Ctrl+Espaco com a timeline em foco."
