# ToolForge — one-time setup (Windows / PowerShell)
# Creates a local Python venv, installs deps, and seeds .env. Safe to re-run.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "ToolForge setup in $PSScriptRoot" -ForegroundColor Cyan

if (-not (Test-Path ".venv")) {
  python -m venv .venv
  Write-Host "Created .venv"
}

& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip | Out-Null
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from template." -ForegroundColor Yellow
  Write-Host "  -> Add OPENAI_API_KEY only if you want to RECORD new tools. Running tools needs no key." -ForegroundColor Yellow
}

$py = (Resolve-Path ".\.venv\Scripts\python.exe").Path
Write-Host ""
Write-Host "Done. Python interpreter for the plugin:" -ForegroundColor Green
Write-Host "  $py"
Write-Host ""
Write-Host "Next: register the plugin in your agent (see docs/INSTALL-plugin.md), using that interpreter path."
