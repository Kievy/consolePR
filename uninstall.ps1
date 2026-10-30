# Removes ConsolePR. CEP debug mode stays on because other extensions may rely on it.
$target = Join-Path $env:APPDATA "Adobe\CEP\extensions\com.consolepr"
if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
    Write-Host "ConsolePR removido. Reinicie o Premiere."
} else {
    Write-Host "ConsolePR nao esta instalado."
}
