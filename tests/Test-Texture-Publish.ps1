# Isolated Windows PowerShell 5.1 uploader QA. No network access, no GitHub push.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Set-StrictMode -Version 2
$source=Join-Path (Split-Path $PSScriptRoot -Parent) 'Update-uGame.ps1'
$tokens=$null; $errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($source,[ref]$tokens,[ref]$errors)
if($errors.Count){ throw ($errors | Out-String) }
foreach($node in $ast.EndBlock.Statements){
  if($node -is [Management.Automation.Language.FunctionDefinitionAst]){ . ([scriptblock]::Create($node.Extent.Text)) }
}
$script:GitExe=(Microsoft.PowerShell.Core\Get-Command git.exe -CommandType Application | Select-Object -First 1).Source
$script:Remote='https://github.com/sunpole/uGame.git'
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('ugame-upload-test-'+[guid]::NewGuid().ToString('N'))
$script:Root=Join-Path $fixture 'client'
$bare=Join-Path $fixture 'remote.git'
$seed=Join-Path $fixture 'seed'
[void][IO.Directory]::CreateDirectory($fixture)
function Native([string]$at,[string[]]$Arguments){
  $old=$ErrorActionPreference;$ErrorActionPreference='Continue'
  try{$result=& $script:GitExe -C $at @Arguments 2>&1;$exit=$LASTEXITCODE}finally{$ErrorActionPreference=$old}
  if($exit -ne 0){throw ($result|Out-String)}
  return (($result|Out-String).Trim())
}
function Check([bool]$condition,[string]$label){if(-not $condition){throw ('FAIL '+$label)};Write-Host ('PASS '+$label)}
[void](Native $fixture @('init','--bare','--initial-branch=main',$bare))
[void][IO.Directory]::CreateDirectory($seed)
[void](Native $seed @('init','-b','main'))
[void](Native $seed @('config','user.name','Updater Test'))
[void](Native $seed @('config','user.email','test@example.invalid'))
$relative='assets\textures\biomes'
$seedTextures=Join-Path $seed $relative
[void][IO.Directory]::CreateDirectory($seedTextures)
function JPEG([string]$path,[int]$red,[int]$green,[int]$blue){
  $bitmap=New-Object System.Drawing.Bitmap -ArgumentList 1024,1024
  try{
    $color=[System.Drawing.Color]::FromArgb($red,$green,$blue)
    $g=[System.Drawing.Graphics]::FromImage($bitmap)
    try{$g.Clear($color)}finally{$g.Dispose()}
    $bitmap.Save($path,[System.Drawing.Imaging.ImageFormat]::Jpeg)
  }finally{$bitmap.Dispose()}
}
JPEG (Join-Path $seedTextures 'ground_1024.jpg') 105 80 25
JPEG (Join-Path $seedTextures 'city_ground_1024.jpg') 190 190 185
'initial' | Set-Content (Join-Path $seed 'safe.txt')
[void](Native $seed @('add','.'))
[void](Native $seed @('commit','-m','test fixture'))
[void](Native $seed @('push',$bare,'HEAD:main'))
[void](Native $fixture @('clone',$bare,$script:Root))
[void](Native $script:Root @('remote','set-url','origin',$script:Remote))
[void](Native $script:Root @('config','user.name','Uploader Test'))
[void](Native $script:Root @('config','user.email','test@example.invalid'))
$before=Native $script:Root @('rev-parse','HEAD')
$script:Temp=Join-Path $fixture 'scratch'
[void][IO.Directory]::CreateDirectory($script:Temp)
$script:Log=Join-Path $fixture 'updater.log'
$script:Outcome='starting'
$clientTextures=Join-Path $script:Root $relative
JPEG (Join-Path $clientTextures 'ground_1024.jpg') 130 110 30
JPEG (Join-Path $clientTextures 'city_ground_1024.jpg') 220 220 215
# Deliberately dirty client, including staged/untracked data. Nothing must be uploaded.
'client edit' | Set-Content (Join-Path $script:Root 'safe.txt')
'secret local' | Set-Content (Join-Path $script:Root 'private.txt')
[void](Native $script:Root @('add','safe.txt'))
$beforeStatus=Native $script:Root @('status','--porcelain=v1','--untracked-files=all')
Set-Item Function:GitReal (Get-Command Git).ScriptBlock
function Git([string[]]$Arguments){
  $redirect=@($Arguments | ForEach-Object {if($_ -ceq $script:Remote){$bare}else{$_}})
  # Only the isolated fixture uses local file transport; production still permits HTTPS only.
  if($Arguments -contains 'fetch' -or $Arguments -contains 'push'){
    $redirect=@('-c','protocol.file.allow=always') + $redirect
  }
  return GitReal $redirect
}
# GH may be installed on the CI runner: never create a real PR in unit tests.
function Get-Command {param($Name,$CommandType,$ErrorAction)
  if($Name -eq 'gh.exe'){return $null}
  return Microsoft.PowerShell.Core\Get-Command $Name -CommandType $CommandType -ErrorAction $ErrorAction
}
function Read-Host {param($Prompt);return 'CANCEL'}
Publish-SouthTextures
Check ((Native $bare @('for-each-ref','--format=%(refname)','refs/heads/assets/')) -eq '') 'cancellation pushes nothing'
function Read-Host {param($Prompt);return 'UPLOAD'}
$cityImage=Join-Path $clientTextures 'city_ground_1024.jpg'
$originalCity=[IO.File]::ReadAllBytes($cityImage)
[IO.File]::WriteAllBytes($cityImage,(New-Object byte[] 2200))
$invalidBlocked=$false
try { Publish-SouthTextures }catch{$invalidBlocked=$true}
Check $invalidBlocked 'invalid JPEG is rejected before upload'
[IO.File]::WriteAllBytes($cityImage,$originalCity)
Publish-SouthTextures
$refs=@((Native $bare @('for-each-ref','--format=%(refname)','refs/heads/assets/')) -split '\r?\n' | Where-Object {$_})
Check ($refs.Count -eq 1) 'exactly one review branch pushed'
Check ((Native $bare @('rev-parse','main')) -eq $before) 'remote main is unchanged'
Check ((Native $script:Root @('rev-parse','HEAD')) -eq $before) 'local main HEAD is unchanged'
Check ((Native $script:Root @('status','--porcelain=v1','--untracked-files=all')) -eq $beforeStatus) 'local dirty and staged files are unchanged'
$paths=@((Native $bare @('diff-tree','--no-commit-id','--name-only','-r',$refs[0])) -split '\r?\n' | Where-Object {$_})
Check ($paths.Count -eq 2 -and $paths -contains 'assets/textures/biomes/ground_1024.jpg' -and $paths -contains 'assets/textures/biomes/city_ground_1024.jpg') 'upload allowlist enforces exactly two JPEG paths'
foreach($mapping in @(@('ground_1024.jpg','ground_1024.jpg'),@('city_ground_1024.jpg','city_ground_1024.jpg'))){
  $hash=Native $script:Root @('hash-object',(Join-Path $clientTextures $mapping[0]))
  $remoteHash=Native $bare @('rev-parse',($refs[0]+':assets/textures/biomes/'+$mapping[1]))
  Check ($hash -eq $remoteHash) ('exact JPEG bytes preserved: '+$mapping[1])
}
Check (-not (Test-Path -LiteralPath (Join-Path $script:Temp 'texture-publish-worktree'))) 'temporary worktree removed'
Write-Host 'All South upload fixture checks passed; no GitHub access was used.'
