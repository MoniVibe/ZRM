@echo off
title StackCRM - Update
REM Double-click to download the latest version of StackCRM from GitHub.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1"
