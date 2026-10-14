@echo off
cd /d "%~dp0"
git pull
start "" "%~dp0dist\index.html"
