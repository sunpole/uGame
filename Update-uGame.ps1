[CmdletBinding()]
param([ValidateSet('menu','status','sync','report','run','github','rollback','resume')][string]$Command = 'menu')
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
$script:Root = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$script:Remote = 'https://github.com/sunpole/uGame.git'
$script:Request = 0
$script:Outcome = 'No operation yet.'

function Git {
    param([string[]]$Arguments)
    # Disable executable Git extensions; pass arguments without evaluating shell text.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $result = & $script:GitExe -C $script:Root -c core.hooksPath=NUL -c core.fsmonitor=false -c submodule.recurse=false -c core.pager=cat -c filter.lfs.clean= -c filter.lfs.smudge= -c filter.lfs.process= -c filter.lfs.required=false @Arguments 2>&1; $code = $LASTEXITCODE } finally { $ErrorActionPreference = $previousPreference }
    if ($code -ne 0) { throw "Git operation failed ($($Arguments[0])). No forced recovery was attempted." }
    return (($result | Out-String).Trim())
}
function Assert-Repository {
    $top = Git @('rev-parse','--show-toplevel')
    if ([IO.Path]::GetFullPath($top).TrimEnd('\') -ne $script:Root) { throw 'Launcher must be at the repository root.' }
    $origin = Git @('config','--get-all','remote.origin.url')
    if ($origin -cnotin @($script:Remote,'https://github.com/sunpole/uGame','git@github.com:sunpole/uGame.git')) { throw 'Origin is not sunpole/uGame.' }
    # Attributes can select locally configured command filters during status/checkout.
    $keys = Git @('config','--name-only','--list')
    if ($keys -match '(?im)^(filter\.(?!lfs\.)|url\..*\.(insteadof|pushinsteadof)$|core\.gitproxy$)') {
        throw 'Git command filters, URL rewrites or proxy commands need manual review.'
    }
}
function Assert-Clean {
    Assert-Repository
    if (Git @('status','--porcelain=v1','--untracked-files=all')) { throw 'Local changes or untracked files exist. Save/commit or move them yourself, then retry.' }
    foreach ($name in @('MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','rebase-merge','rebase-apply','BISECT_START')) {
        $path = Git @('rev-parse','--git-path',$name)
        if (-not [IO.Path]::IsPathRooted($path)) { $path = Join-Path $script:Root $path }
        if (Test-Path -LiteralPath $path) { throw 'Another Git operation is in progress.' }
    }
}
function Write-Log([string]$Message) {
    $script:Outcome = $Message
    [IO.File]::AppendAllText($script:Log,((Get-Date -Format o) + ' ' + $Message + [Environment]::NewLine))
    Write-Host $Message
}
function Sync-Project {
    Assert-Clean
    if ((Git @('branch','--show-current')) -ne 'main') { throw 'Sync requires main. Use 8 after an updater rollback.' }
    $before = Git @('rev-parse','HEAD')
    Write-Host 'Checking GitHub...'
    # Fixed URL/ref; no pull configuration, tags, submodules or executable manifests.
    [void](Git @('-c','protocol.allow=never','-c','protocol.https.allow=always','-c','http.followRedirects=false','fetch','--no-tags','--no-recurse-submodules',$script:Remote,'refs/heads/main:refs/remotes/origin/main'))
    $target = Git @('rev-parse','--verify','FETCH_HEAD^{commit}')
    [void](Git @('merge-base','--is-ancestor',$before,$target))
    if ($before -eq $target) { Write-Log 'Already up to date.'; return }
    Assert-Clean
    if ((Git @('rev-parse','HEAD')) -ne $before) { throw 'HEAD changed during download. Retry.' }
    $id = (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '-' + [guid]::NewGuid().ToString('N')
    $backup = 'refs/ugame/backups/' + $id
    [void](Git @('update-ref',$backup,$before,('0' * 40)))
    Write-Log "Before=$before Target=$target Backup=$backup"
    [void](Git @('merge','--ff-only','--no-edit','--no-overwrite-ignore',$target))
    if ((Git @('rev-parse','HEAD')) -ne $target) { throw 'Unexpected HEAD after merge.' }
    Write-Log 'Updated. Restart Update-uGame.cmd to load the new updater.'
    $script:StopMenu = $true
}
function Rollback-Project {
    Assert-Clean
    if ((Git @('branch','--show-current')) -ne 'main') { throw 'Rollback requires main.' }
    $refs = Git @('for-each-ref','--sort=-refname','--format=%(refname)','refs/ugame/backups/')
    if (-not $refs) { throw 'No updater backup exists.' }
    $backup = ($refs -split '\r?\n')[0]
    $target = Git @('rev-parse',($backup + '^{commit}'))
    Write-Host "Restore files from $target. main and its newer commits remain intact."
    if ((Read-Host 'Type ROLLBACK to continue') -cne 'ROLLBACK') { return }
    Assert-Clean
    [void](Git @('checkout','--detach','--no-overwrite-ignore',$target))
    Write-Log "Rollback to $target (detached). Use 8 in this menu to return to main."
}
function Resume-Project {
    Assert-Clean
    if (Git @('branch','--show-current')) { throw 'Resume is only for detached rollback state.' }
    [void](Git @('checkout','--no-overwrite-ignore','main'))
    Write-Log 'Returned to main. Restart Update-uGame.cmd.'
    $script:StopMenu = $true
}
function Show-Status {
    Assert-Repository
    Write-Host ('Folder: ' + $script:Root)
    Write-Host (Git @('status','--short','--branch','--untracked-files=all'))
    Write-Host ('HEAD: ' + (Git @('rev-parse','HEAD')))
    Write-Host ('Log: ' + $script:Log)
}
function New-Report {
    Assert-Repository
    $script:Request++
    if ($script:Request -gt 999) { throw 'Restart the updater for a new report session.' }
    $body = @('uGame ChatGPT report',('Session: S{0:D3} Request: R{1:D3}' -f $script:Session,$script:Request),('Created: ' + (Get-Date -Format o)),('HEAD: ' + (Git @('rev-parse','HEAD'))),('Branch: ' + (Git @('branch','--show-current'))),('Result: ' + $script:Outcome),'Status:',(Git @('status','--short','--untracked-files=all')))
    $name = 'uGame_report_S{0:D3}_R{1:D3}_{2}.txt' -f $script:Session,$script:Request,(Get-Date -Format 'yyyyMMdd_HHmmss.ff')
    $path = Join-Path $script:Temp $name
    $stream = [IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
    try {
        $bytes = (New-Object Text.UTF8Encoding($true)).GetBytes(($body -join [Environment]::NewLine))
        $stream.Write($bytes,0,$bytes.Length)
    } finally { $stream.Dispose() }
    Write-Host "Temporary report: $path"
    Write-Host 'Copy to ChatGPT. Reports are never uploaded or placed in the repository.'
    Start-Process -FilePath (Join-Path $env:WINDIR 'System32\notepad.exe') -ArgumentList ('"' + $path + '"') | Out-Null
}
function Run-Project {
    Assert-Repository
    $manifest = Join-Path $script:Root 'package.json'
    if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) { throw 'The game is not prepared yet: package.json is missing.' }
    $package = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    if (-not $package.PSObject.Properties['scripts'] -or -not $package.scripts.PSObject.Properties['dev']) { throw 'The project has no dev command yet.' }
    Write-Host ('Local npm dev script: ' + [string]$package.scripts.dev)
    Write-Host 'RUN executes local project code. Dependencies are not installed automatically.'
    if ((Read-Host 'Type RUN to run this checked-out project') -cne 'RUN') { return }
    $npm = (Get-Command npm.cmd -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    Push-Location -LiteralPath $script:Root
    try { & $npm --ignore-scripts run dev; if ($LASTEXITCODE -ne 0) { throw 'Project launch failed. Dependencies may not be installed.' } }
    finally { Pop-Location }
}
function Invoke-Action([string]$Action) {
    switch ($Action) {
        'sync' { Sync-Project }
        'status' { Show-Status }
        'report' { New-Report }
        'run' { Run-Project }
        'github' { Start-Process 'https://github.com/sunpole/uGame' | Out-Null }
        'rollback' { Rollback-Project }
        'resume' { Resume-Project }
    }
}
function Main {
    $lock = $null
    try {
        $script:GitExe = (Get-Command git.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
        if (Get-ChildItem Env: | Where-Object { $_.Name -match '^GIT_(DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG.*|EXEC_PATH|TEMPLATE_DIR)$' }) { throw 'Git environment overrides are set. Open a normal terminal and retry.' }
        Assert-Repository
        $gitDir = Git @('rev-parse','--absolute-git-dir')
        $lock = [IO.File]::Open((Join-Path $gitDir 'ugame-updater.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
        $script:Temp = Join-Path ([IO.Path]::GetTempPath()) ('uGame-' + [guid]::NewGuid().ToString('N'))
        if ([IO.Path]::GetFullPath($script:Temp).StartsWith($script:Root + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'TEMP must be outside the repository.' }
        [void][IO.Directory]::CreateDirectory($script:Temp)
        # Local metadata only; session wraps after 999. Unique temp directory prevents collisions.
        $counter = Join-Path $gitDir 'ugame-session'
        $script:Session = 1
        if (Test-Path -LiteralPath $counter) { $script:Session = ([int][IO.File]::ReadAllText($counter) % 999) + 1 }
        [IO.File]::WriteAllText($counter,[string]$script:Session)
        $script:Log = Join-Path $gitDir 'ugame-updater.log'
        if (Test-Path -LiteralPath $script:Log) { $script:Outcome = Get-Content -LiteralPath $script:Log -Tail 1 }
        $script:StopMenu = $false
        if ($Command -ne 'menu') { Invoke-Action $Command; return }
        while (-not $script:StopMenu) {
            Write-Host "=== uGame ==="
            Write-Host "1. Update from GitHub\n2. Status\n3. ChatGPT report\n4. Run project\n5. Open GitHub\n6. Open project folder\n7. Rollback files\n8. Return to main\n0. Exit".Replace('\n',[Environment]::NewLine)
            $choice = Read-Host 'Number'
            try {
                switch ($choice) {
                    '0' { $script:StopMenu = $true }
                    '1' { Invoke-Action sync }
                    '2' { Invoke-Action status }
                    '3' { Invoke-Action report }
                    '4' { Invoke-Action run }
                    '5' { Invoke-Action github }
                    '6' { Start-Process -FilePath (Join-Path $env:WINDIR 'explorer.exe') -ArgumentList ('"' + $script:Root + '"') | Out-Null }
                    '7' { Invoke-Action rollback }
                    '8' { Invoke-Action resume }
                    default { Write-Host 'Choose a number from 0 to 8.' }
                }
            } catch { Write-Log ('STOP: ' + $_.Exception.Message) }
        }
    } catch { Write-Host ('STOP: ' + $_.Exception.Message); exit 1 }
    finally { if ($null -ne $lock) { $lock.Dispose() } }
}
Main
