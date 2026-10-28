@echo off
cd /d "%~dp0"
if not exist node_modules\next (
 echo Avval 1-TEST-SOZLASH.cmd faylini oching.
 pause
 exit /b 1
)
echo Sayt: http://localhost:3000 - toxtatish: Ctrl+C
call npm.cmd run dev:test
pause
