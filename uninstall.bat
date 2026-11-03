@echo off
setlocal
set "LANG=pt"
for /f "tokens=3" %%a in ('reg query "HKCU\Control Panel\International" /v LocaleName 2^>nul') do set "WINLOCALE=%%a"
if defined WINLOCALE (
    echo.%WINLOCALE%| findstr /i /b "pt" >nul || set "LANG=en"
)
if /i "%LANG%"=="pt" (
    title ConsolePR - Remocao
) else (
    title ConsolePR - Uninstall
)

set "TARGET=%APPDATA%\Adobe\CEP\extensions\com.consolepr"

rem CEP debug mode stays on because other extensions may rely on it.
if not exist "%TARGET%" goto missing

rmdir /s /q "%TARGET%"
if exist "%TARGET%" goto failed
if exist "%APPDATA%\ConsolePR" rmdir /s /q "%APPDATA%\ConsolePR"
if /i "%LANG%"=="en" goto removed_en
echo ConsolePR removido. Reinicie o Premiere e o After Effects.
goto end

:removed_en
echo ConsolePR removed. Restart Premiere and After Effects.
goto end

:missing
if /i "%LANG%"=="en" goto missing_en
echo ConsolePR nao esta instalado.
goto end

:missing_en
echo ConsolePR is not installed.
goto end

:failed
if /i "%LANG%"=="en" goto failed_en
echo A remocao falhou. Feche o Premiere e o After Effects e tente de novo.
goto end

:failed_en
echo Removal failed. Close Premiere and After Effects and try again.

:end
echo.
pause
