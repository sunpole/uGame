# Tests use disposable Git repositories, not the user's checkout.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$source = Join-Path (Split-Path $PSScriptRoot -Parent) 'Update-uGame.ps1'
$tokens=$null; $errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw ($errors | Out-String) }
foreach ($node in $ast.EndBlock.Statements) {
    if ($node -is [Management.Automation.Language.FunctionDefinitionAst]) { . ([scriptblock]::Create($node.Extent.Text)) }
}
$script:GitExe=(Get-Command git.exe -CommandType Application | Select-Object -First 1).Source
$script:Remote='https://github.com/sunpole/uGame.git'
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('uGame-tests-'+[guid]::NewGuid().ToString('N'))
$script:Root=Join-Path $fixture 'client'
$upstream=Join-Path $fixture 'upstream'
[void][IO.Directory]::CreateDirectory($upstream)
function SetupGit([string]$At,[string[]]$Arguments) {
    $old=$ErrorActionPreference; $ErrorActionPreference='Continue'
    try { $out=& $script:GitExe -C $At @Arguments 2>&1; $code=$LASTEXITCODE }
    finally { $ErrorActionPreference=$old }
    if ($code -ne 0) { throw ($out | Out-String) }
    return (($out | Out-String).Trim())
}
function Check([bool]$Condition,[string]$Label) {
    if (-not $Condition) { throw "FAIL: $Label" }; Write-Host "PASS: $Label"
}
function Refused([scriptblock]$Action,[string]$Label) {
    $blocked=$false; try { & $Action } catch { $blocked=$true }; Check $blocked $Label
}
[void](SetupGit $upstream @('init','-b','main'))
[void](SetupGit $upstream @('config','user.name','Updater Test'))
[void](SetupGit $upstream @('config','user.email','updater-test@example.invalid'))
'one' | Set-Content (Join-Path $upstream 'payload.txt')
'ignored.txt' | Set-Content (Join-Path $upstream '.gitignore')
[void](SetupGit $upstream @('add','.'))
[void](SetupGit $upstream @('commit','-m','initial'))
[void](SetupGit $fixture @('clone',$upstream,$script:Root))
[void](SetupGit $script:Root @('remote','set-url','origin',$script:Remote))
[void](SetupGit $script:Root @('config','user.name','Updater Test'))
[void](SetupGit $script:Root @('config','user.email','updater-test@example.invalid'))
$before=Git @('rev-parse','HEAD')
$script:Log=Join-Path $fixture 'test.log'; $script:Temp=$fixture
$script:Session=1; $script:Request=0; $script:Outcome='test'; $script:StopMenu=$false
# Only the network fetch is redirected to a local fixture. Remaining Git calls are real.
Set-Item Function:GitReal (Get-Command Git).ScriptBlock
function Git([string[]]$Arguments) {
    if ($Arguments -contains 'fetch') {
        Check ($Arguments -contains 'protocol.allow=never') 'fetch protocol restriction'
        Check ($Arguments -contains 'http.followRedirects=false') 'fetch redirects disabled'
        Check ($Arguments -contains 'refs/heads/main:refs/remotes/origin/main') 'fixed remote tracking ref'
        return GitReal @('fetch','--no-tags','--no-recurse-submodules',$upstream,'refs/heads/main:refs/remotes/origin/main')
    }
    return GitReal $Arguments
}
Assert-Clean
'dirty' | Add-Content (Join-Path $script:Root 'payload.txt')
Refused { Sync-Project } 'tracked edits block sync'
[void](Git @('restore','payload.txt'))
'new' | Set-Content (Join-Path $script:Root 'new.txt')
Refused { Sync-Project } 'untracked files block sync'
Remove-Item -LiteralPath (Join-Path $script:Root 'new.txt')
'merge' | Set-Content (Join-Path $script:Root '.git/MERGE_HEAD')
Refused { Sync-Project } 'unfinished merge blocks sync'
Remove-Item -LiteralPath (Join-Path $script:Root '.git/MERGE_HEAD')
[void](SetupGit $script:Root @('remote','set-url','origin','https://example.invalid/repo.git'))
Refused { Sync-Project } 'wrong origin blocked'
[void](SetupGit $script:Root @('remote','set-url','origin',$script:Remote))
[void](SetupGit $script:Root @('config','filter.evil.smudge','echo bad'))
Refused { Assert-Repository } 'custom executable filter blocked'
[void](SetupGit $script:Root @('config','--remove-section','filter.evil'))
$hook=Join-Path $script:Root '.git/hooks/post-merge'
[IO.File]::WriteAllText($hook,"#!/bin/sh"+[char]10+"echo bad > hook-ran.txt"+[char]10)
'two' | Set-Content (Join-Path $upstream 'payload.txt')
[void](SetupGit $upstream @('add','.'))
[void](SetupGit $upstream @('commit','-m','upstream update'))
$after=SetupGit $upstream @('rev-parse','HEAD')
Sync-Project
Check ((Git @('rev-parse','HEAD')) -eq $after) 'real fast-forward reaches target'
Check ((Git @('rev-parse','origin/main')) -eq $after) 'remote tracking matches updated HEAD'
Check (-not (Test-Path (Join-Path $script:Root 'hook-ran.txt'))) 'post-merge hook not executed'
Check ((Git @('for-each-ref','--format=%(objectname)','refs/ugame/backups/')) -eq $before) 'pre-update commit retained'
$script:StopMenu=$false
Sync-Project
Check ((Git @('for-each-ref','--format=%(objectname)','refs/ugame/backups/')) -eq $before) 'no-op preserves backup'
function Read-Host { param($Prompt) return 'ROLLBACK' }
Rollback-Project
Check ((Git @('rev-parse','HEAD')) -eq $before) 'rollback restores old commit'
Check ((Git @('rev-parse','main')) -eq $after) 'rollback preserves main'
Refused { Sync-Project } 'detached HEAD blocks sync'
Resume-Project
Check ((Git @('rev-parse','HEAD')) -eq $after) 'resume restores main'
# Report UI is stubbed, but real report files are inspected.
function Start-Process { param($FilePath,$ArgumentList) }
New-Report
New-Report
$reports=@(Get-ChildItem -LiteralPath $fixture -Filter 'uGame_report_*.txt')
Check ($reports.Count -eq 2) 'two distinct report files'
Check (@($reports | Where-Object { $_.Name -notmatch '^uGame_report_S001_R00[12]_\d{8}_\d{6}\.\d{2}\.txt$' }).Count -eq 0) 'report filename contract'
Check ((Git @('status','--porcelain')) -eq '') 'reports do not change checkout'
Refused { Run-Project } 'missing game handled'
# Ignored local data must not be overwritten by a newly tracked upstream file.
'keep-local' | Set-Content (Join-Path $script:Root 'ignored.txt')
'remote-data' | Set-Content (Join-Path $upstream 'ignored.txt')
[void](SetupGit $upstream @('add','-f','ignored.txt'))
[void](SetupGit $upstream @('commit','-m','track previously ignored path'))
Refused { Sync-Project } 'ignored file collision blocks update'
Check ((Get-Content (Join-Path $script:Root 'ignored.txt')) -eq 'keep-local') 'ignored data preserved'
Check ((Git @('rev-parse','HEAD')) -eq $after) 'failed update retains HEAD'
Remove-Item -LiteralPath (Join-Path $script:Root 'ignored.txt')
Sync-Project
# Local LFS commands must not run even when remote attributes select that filter.
[void](SetupGit $script:Root @('config','filter.lfs.smudge','echo bad > lfs-ran.txt'))
'filtered.txt filter=lfs' | Set-Content (Join-Path $upstream '.gitattributes')
'plain content' | Set-Content (Join-Path $upstream 'filtered.txt')
[void](SetupGit $upstream @('-c','filter.lfs.clean=','-c','filter.lfs.process=','-c','filter.lfs.required=false','add','.'))
[void](SetupGit $upstream @('commit','-m','attribute filter boundary'))
Sync-Project
Check (-not (Test-Path (Join-Path $script:Root 'lfs-ran.txt'))) 'LFS executable filter suppressed'
'local' | Set-Content (Join-Path $script:Root 'payload.txt')
[void](Git @('add','.'))
[void](Git @('commit','-m','local work'))
$local=Git @('rev-parse','HEAD')
Refused { Sync-Project } 'local-ahead history blocked'
'remote' | Set-Content (Join-Path $upstream 'payload.txt')
[void](SetupGit $upstream @('add','.'))
[void](SetupGit $upstream @('commit','-m','divergent work'))
Refused { Sync-Project } 'divergent history blocked'
Check ((Git @('rev-parse','HEAD')) -eq $local) 'local commits preserved'
Write-Host "All checks passed. Isolated evidence retained at $fixture"
