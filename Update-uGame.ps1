$Host.UI.RawUI.WindowTitle = "uGame Updater"

Write-Host "=========================="
Write-Host "      uGame Updater"
Write-Host "=========================="
Write-Host ""

if (git status --porcelain) {
    Write-Host "[STOP] Local changes found."
    git status --short
    Read-Host "Press Enter"
    exit 1
}

Write-Host "Checking GitHub..."
git fetch origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] GitHub check failed."
    Read-Host "Press Enter"
    exit 1
}

Write-Host ""
Write-Host "Updating..."
git pull --ff-only origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Update stopped."
    Read-Host "Press Enter"
    exit 1
}

Write-Host ""
Write-Host "[OK] uGame is up to date."
Read-Host "Press Enter"
