@echo off
title StackCRM - Stop
REM Double-click to stop StackCRM if it's running.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1"
