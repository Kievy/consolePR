@echo off
setlocal
set "LANG=pt"
for /f "tokens=3" %%a in ('reg query "HKCU\Control Panel\International" /v LocaleName 2^>nul') do set "WINLOCALE=%%a"
if defined WINLOCALE (
    echo.%WINLOCALE%| findstr /i /b "pt" >nul || set "LANG=en"
)
if /i "%LANG%"=="pt" (
    title ConsolePR - Instalacao
) else (
    title ConsolePR - Install
)

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

if /i "%LANG%"=="en" goto installed_en
echo ConsolePR instalado em %TARGET%
echo Reinicie o Premiere e o After Effects.
echo Atalho nos dois programas: Ctrl+Espaco.
goto end

:installed_en
echo ConsolePR installed to %TARGET%
echo Restart Premiere and After Effects.
echo Shortcut in both apps: Ctrl+Space.
goto end

:missing
if /i "%LANG%"=="en" goto missing_en
echo Arquivos do ConsolePR nao encontrados.
echo Se abriu este arquivo de dentro do ZIP, extraia o ZIP primeiro.
goto end

:missing_en
echo ConsolePR files were not found.
echo If you opened this file from inside the ZIP, extract the ZIP first.
goto end

:failed
if /i "%LANG%"=="en" goto failed_en
echo A instalacao falhou. Feche o Premiere e o After Effects e tente de novo.
goto end

:failed_en
echo Installation failed. Close Premiere and After Effects and try again.

:end
echo.
pause
