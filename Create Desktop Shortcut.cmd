@echo off
title StackCRM - Create Desktop Shortcut
REM Double-click once to put a "StackCRM" icon on the Desktop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-shortcut.ps1"
