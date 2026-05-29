@echo off
REM Launches the StackCRM MCP server over stdio (for Claude Desktop / Claude Code).
REM Sets the working directory to the repo so dependencies resolve, then runs the
REM server. Requires the StackCRM app to be running (use "Launch StackCRM").
cd /d "%~dp0.."
node --import tsx "mcp\server.ts"
