param(
    [Parameter(Mandatory = $true)]
    [string]$Task,

    [Parameter(Mandatory = $false)]
    [string[]]$Files = @(),

    [Parameter(Mandatory = $false)]
    [string]$Model = "gemini-3.1-flash-lite",

    [Parameter(Mandatory = $false)]
    [ValidateSet("default", "auto_edit", "yolo", "plan")]
    [string]$ApprovalMode = "yolo",

    [bool]$SkipTrust = $true,
    [switch]$ValidateAfter
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Resolve-RepoPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return (Resolve-Path $Path).Path
    }

    return (Resolve-Path (Join-Path $repoRoot $Path)).Path
}

function Get-RepoRelativePath {
    param([Parameter(Mandatory = $true)][string]$Path)
    return ($Path.Substring($repoRoot.Length)).TrimStart('\').Replace('\', '/')
}

$resolvedFiles = @()
$displayFiles = @()
foreach ($file in $Files) {
    $resolved = Resolve-RepoPath -Path $file
    $resolvedFiles += $resolved
    $displayFiles += Get-RepoRelativePath -Path $resolved
}

$fileLines = if ($displayFiles.Count -gt 0) {
    ($displayFiles | ForEach-Object { "- $_" }) -join "`n"
}
else {
    "- (no explicit file list provided)"
}

$prompt = @"
You are working in G:\govibe.

Task:
$Task

Rules:
- Make the smallest safe change.
- Edit only the explicitly listed files when a file list is provided.
- Do not touch unrelated files.
- Keep existing style and metadata structure.
- If a requested change is unsafe or ambiguous, stop and explain the blocker.
- After editing, print a one-line summary and the files changed.

Allowed files:
$fileLines
"@

$geminiArgs = @(
    "-p", $prompt,
    "-m", $Model,
    "--approval-mode", $ApprovalMode
)

if ($SkipTrust) {
    $geminiArgs = @("--skip-trust") + $geminiArgs
}

Push-Location $repoRoot
try {
    & gemini @geminiArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Gemini CLI failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

if ($ValidateAfter) {
    & npm run docs:validate
    if ($LASTEXITCODE -ne 0) {
        throw "docs:validate failed after Gemini run."
    }
}
