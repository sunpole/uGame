$Host.UI.RawUI.WindowTitle = "uGame Updater"

Write-Host "=========================="
Write-Host "      uGame Updater"
Write-Host "=========================="
Write-Host ""

if (git status --porcelain) {
    Write-Host "[СТ] сть локальные изменения."
    git status --short
    Read-Host "ажмите Enter"
    exit 1
}

Write-Host "роверяю GitHub..."
git fetch origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "[Ш] е удалось проверить GitHub."
    Read-Host "ажмите Enter"
    exit 1
}

Write-Host ""
Write-Host "олучаю обновления..."
git pull --ff-only origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "[Ш] бновление остановлено."
    Read-Host "ажмите Enter"
    exit 1
}

Write-Host ""
Write-Host "[OK] uGame обновлён."
Read-Host "ажмите Enter"
