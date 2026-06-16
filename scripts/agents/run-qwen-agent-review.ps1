param(
  [string]$Role = "ATHER",
  [string]$Scope = ".",
  [string]$Task,
  [string]$Mode = "review",
  [string]$Model = "google/gemma-4-31b-it:free",
  [string[]]$ExtraContext = @()
)

$ErrorActionPreference = "Stop"

if (-not $Task) {
  throw "Task is required. Example: -Task `"Audit current git state`""
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $repoRoot

$contextFiles = @(
  "AGENTS.md",
  "AGENT.md",
  ".agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md",
  ".agents/context/CONTEXT-Bounded-External-Executor.md"
)

if ($Mode -eq "git" -or $Task -match "git|commit|push|worktree|status") {
  $contextFiles += ".agents/context/shared/CONTEXT-GoVibe-Git-Hygiene.md"
}

$contextFiles += $ExtraContext

$missing = @()
$contextText = foreach ($file in $contextFiles) {
  if (Test-Path -LiteralPath $file) {
    "===== $file =====`n" + (Get-Content -LiteralPath $file -Raw)
  } else {
    $missing += $file
  }
}

if ($missing.Count -gt 0) {
  throw "blocked_by_missing_context: $($missing -join ', ')"
}

$gitStatus = git status --short --branch
$systemPrompt = @"
You are $Role acting as a bounded external GoVibe executor.
Use only the supplied shared context and factual packet.
Do not invent project state.
Return concise, evidence-backed output using the required response contract.
"@

$prompt = @"
Mode: $Mode
Scope: $Scope
Task: $Task

Factual packet:
repo_root_checked: $repoRoot
git_status_summary:
$gitStatus
context_files_read:
$($contextFiles -join "`n")
context_source_used: explicit_system_prompt + shared_context_files
model_name: $Model
model_route: qwen-cli

Shared context:
$($contextText -join "`n`n")
"@

qwen --model $Model --no-stream --system $systemPrompt $prompt
