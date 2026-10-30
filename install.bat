@echo off
setlocal
title ConsolePR - Instalacao

set "SOURCE=%~dp0extension"
set "TARGET=%APPDATA%\Adobe\CEP\extensions\com.consolepr"

if not exist "%SOURCE%\CSXS\manifest.xml" goto missing

if exist "%TARGET%" rmdir /s /q "%TARGET%"
xcopy "%SOURCE%" "%TARGET%\" /e /i /q /y >nul
if errorlevel 1 goto failed
if not exist "%TARGET%\CSXS\manifest.xml" goto failed

rem The extension is unsigned, so CEP debug mode must be on for Premiere to load it.
for /l %%v in (9,1,22) do (
    reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul || goto failed
)

echo ConsolePR instalado em %TARGET%
echo Reinicie o Premiere e o After Effects.
echo Atalho nos dois programas: Ctrl+Espaco.
goto end

:missing
echo Arquivos do ConsolePR nao encontrados.
echo Se abriu este arquivo de dentro do ZIP, extraia o ZIP primeiro.
goto end

:failed
echo A instalacao falhou. Feche o Premiere e o After Effects e tente de novo.

:end
echo.
pause
