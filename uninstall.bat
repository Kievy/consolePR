@echo off
setlocal
title ConsolePR - Remocao

set "TARGET=%APPDATA%\Adobe\CEP\extensions\com.consolepr"

rem CEP debug mode stays on because other extensions may rely on it.
if not exist "%TARGET%" (
    echo ConsolePR nao esta instalado.
    goto end
)

rmdir /s /q "%TARGET%"
if exist "%TARGET%" (
    echo A remocao falhou. Feche o Premiere e tente de novo.
    goto end
)
if exist "%APPDATA%\ConsolePR" rmdir /s /q "%APPDATA%\ConsolePR"
echo ConsolePR removido. Reinicie o Premiere.

:end
echo.
pause
