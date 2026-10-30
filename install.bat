@echo off
title ConsolePR - Instalacao
if not exist "%~dp0install.ps1" goto missing
if not exist "%~dp0extension\CSXS\manifest.xml" goto missing
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
    echo.
    echo A instalacao falhou. Veja a mensagem acima.
)
goto end

:missing
echo Arquivos do ConsolePR nao encontrados.
echo Se abriu este arquivo de dentro do ZIP, extraia o ZIP primeiro.

:end
echo.
pause
