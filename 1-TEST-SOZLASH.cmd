@echo off
cd /d "%~dp0"
call npm.cmd ci
if errorlevel 1 goto fail
call npm.cmd run setup:test
if errorlevel 1 goto fail
echo Tayyor. 2-ISHGA-TUSHIRISH.cmd faylini oching.
pause
exit /b 0
:fail
echo Xato. Yuqoridagi xabarni va TEST-REJIM.md faylini tekshiring.
pause
exit /b 1
