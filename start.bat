@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  python serve.py 8080
) else (
  echo Khong tim thay Python. Dang dung npx serve...
  start "" http://localhost:8080
  npx -y serve -l 8080 -n .
)
