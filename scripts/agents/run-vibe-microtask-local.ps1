param(
    [Parameter(Mandatory = $true)]
    [string]$TaskId,

    [Parameter(Mandatory = $false)]
    [string]$Model = "sushirl:latest",

    [Parameter(Mandatory = $false)]
    [ValidateSet("fast", "balanced", "ui-heavy")]
    [string]$Profile = "balanced",

    [Parameter(Mandatory = $false)]
    [int]$MaxCharsPerFile = 12000,

    [Parameter(Mandatory = $false)]
    [string]$OutputPath,

    [Parameter(Mandatory = $false)]
    [string]$RawOutputPath,

    [switch]$PrintPrompt
)

$profileConfig = @{
    "fast" = @{
        model = "qwen3.5:4b"
        maxCharsPerFile = 8000
        intent = "Quick bounded checks and cheap microtask planning"
    }
    "balanced" = @{
        model = "sushirl:latest"
        maxCharsPerFile = 12000
        intent = "Default frontend microtask work with stronger UI reasoning"
    }
    "ui-heavy" = @{
        model = "qwen3:latest"
        maxCharsPerFile = 16000
        intent = "Heavier layout and UI structure reasoning when more context helps"
    }
}

$selectedProfile = $profileConfig[$Profile]
if (-not $PSBoundParameters.ContainsKey("Model")) {
    $Model = [string]$selectedProfile.model
}
if (-not $PSBoundParameters.ContainsKey("MaxCharsPerFile")) {
    $MaxCharsPerFile = [int]$selectedProfile.maxCharsPerFile
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$microtaskDoc = Join-Path $repoRoot ".agents\frontend\context\VIBE-A2-Visual-Parity-Microtasks.md"
$agentContract = Join-Path $repoRoot ".agents\frontend\AGENT.md"
$parityContext = Join-Path $repoRoot ".agents\frontend\context\VIBE-A2-Roadmap-Template-Parity-Context.md"
$templateReference = Join-Path $repoRoot "docs\design\TEMPLATE_REFERENCE.md"
$domainDetails = Join-Path $repoRoot "docs\design\DOMAIN_DETAILS.md"
$appFile = Join-Path $repoRoot "src\App.tsx"
$stylesFile = Join-Path $repoRoot "src\styles.css"

foreach ($path in @($microtaskDoc, $agentContract, $parityContext, $templateReference, $domainDetails, $appFile, $stylesFile)) {
    if (-not (Test-Path $path)) {
        throw "Missing required file: $path"
    }
}

function Get-FileSnippet {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][int]$Limit
    )

    $raw = Get-Content -Path $Path -Raw
    if ($raw.Length -le $Limit) {
        return $raw
    }

    return $raw.Substring(0, $Limit) + "`n... [truncated by controller]"
}

function Get-TaskPacket {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$RequestedTaskId
    )

    $raw = Get-Content -Path $Path -Raw
    $escapedId = [regex]::Escape($RequestedTaskId)
    $pattern = "(?ms)## Task packet: $escapedId\b(.*?)(?=^## Task packet:|\z)"
    $match = [regex]::Match($raw, $pattern)
    if (-not $match.Success) {
        throw "Task packet not found for $RequestedTaskId in $Path"
    }

    return ("## Task packet: $RequestedTaskId" + $match.Groups[1].Value).Trim()
}

function Remove-ThinkBlock {
    param([Parameter(Mandatory = $true)][string]$Text)
    $withoutTaggedThink = [regex]::Replace($Text, "(?is)<think>.*?</think>", "")
    $withoutPlainThink = [regex]::Replace($withoutTaggedThink, "(?is)^Thinking\.\.\..*?(?=^### VIBE Frontend Output|\z)", "")
    return $withoutPlainThink.Trim()
}

function Remove-AnsiNoise {
    param([Parameter(Mandatory = $false)][AllowEmptyString()][string]$Text)
    $withoutAnsi = [regex]::Replace($Text, "\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])", "")
    $withoutControl = [regex]::Replace($withoutAnsi, "[\u0000-\u0008\u000B\u000C\u000E-\u001F]", "")
    return $withoutControl.Trim()
}

function Test-OutputContract {
    param(
        [Parameter(Mandatory = $false)][AllowEmptyString()][string]$Text,
        [Parameter(Mandatory = $true)][string]$RequestedTaskId
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $false
    }

    if ($Text.Trim() -eq "BLOCKED") {
        return $true
    }

    $required = @(
        "### VIBE Frontend Output",
        "**Task ID:** $RequestedTaskId",
        "Summary:",
        "Implementation Plan:",
        "Blockers:",
        "Verification:",
        "- npm run lint",
        "- npm run build",
        "- npm run diff:check"
    )

    foreach ($token in $required) {
        if (-not $Text.Contains($token)) {
            return $false
        }
    }

    return $true
}

function Test-StalePlan {
    param([Parameter(Mandatory = $false)][AllowEmptyString()][string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $false
    }

    $rejectPatterns = @(
        "CoVibe Development Roadmap",
        "Updated the React A2 header title from",
        "Update metric labels to match template wording",
        "Updated the A2 metric labels to match template wording",
        "Updated A2 header labeling to match the approved GoVibe template contract",
        "GoVibe Development Roadmap, stat labels",
        "Feature count, implemented feature count, backlog tasks"
    )

    foreach ($pattern in $rejectPatterns) {
        if ($Text -match [regex]::Escape($pattern)) {
            return $true
        }
    }

    return $false
}

$taskPacket = Get-TaskPacket -Path $microtaskDoc -RequestedTaskId $TaskId

$contextMap = [ordered]@{
    "AGENT.md" = Get-FileSnippet -Path $agentContract -Limit $MaxCharsPerFile
    "VIBE-A2-Roadmap-Template-Parity-Context.md" = Get-FileSnippet -Path $parityContext -Limit $MaxCharsPerFile
    "VIBE-A2-Visual-Parity-Microtasks.md" = Get-FileSnippet -Path $microtaskDoc -Limit $MaxCharsPerFile
    "docs/design/TEMPLATE_REFERENCE.md" = Get-FileSnippet -Path $templateReference -Limit $MaxCharsPerFile
    "docs/design/DOMAIN_DETAILS.md" = Get-FileSnippet -Path $domainDetails -Limit $MaxCharsPerFile
    "src/App.tsx" = Get-FileSnippet -Path $appFile -Limit $MaxCharsPerFile
    "src/styles.css" = Get-FileSnippet -Path $stylesFile -Limit $MaxCharsPerFile
}

$contextBlocks = foreach ($entry in $contextMap.GetEnumerator()) {
@"
===== BEGIN FILE: $($entry.Key) =====
$($entry.Value)
===== END FILE: $($entry.Key) =====
"@
}

$prompt = @"
You are VIBE, the GoVibe frontend worker.
You are running under a strict controller wrapper for a single microtask.
Execution profile: $Profile
Profile intent: $($selectedProfile.intent)
Selected local model: $Model

Non-negotiable rules:
- Return only the final answer. Never include chain-of-thought.
- Never output <think> blocks.
- Never explain generic agile, UI, or project-management concepts.
- Stay inside the assigned microtask only.
- If you cannot comply exactly, output BLOCKED.

Required output format:
### VIBE Frontend Output

**Task ID:** $TaskId
**Scope:** [single microtask only]
**Complexity:** C-1 | C-2
**Risk:** LOW | MEDIUM

Summary:
- ...
- ...
- ...

Implementation Plan:
1. ...
2. ...
3. ...

Blockers:
- none

Verification:
- npm run lint
- npm run build
- npm run diff:check

Task packet:
$taskPacket

Repository truth:
$($contextBlocks -join "`n`n")
"@

if ($PrintPrompt) {
    $prompt
    if (-not $OutputPath -and -not $RawOutputPath) {
        return
    }
}

$stdinPath = Join-Path $env:TEMP ("vibe-microtask-stdin-" + [guid]::NewGuid().ToString() + ".txt")
$stderrPath = Join-Path $env:TEMP ("vibe-microtask-stderr-" + [guid]::NewGuid().ToString() + ".txt")

try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($stdinPath, $prompt, $utf8NoBom)

    $stdout = Get-Content -Raw -Path $stdinPath | & ollama run $Model 2> $stderrPath
    $rawOutput = ($stdout | Out-String)
    $cleanOutput = Remove-AnsiNoise -Text (Remove-ThinkBlock -Text $rawOutput)

    if ($RawOutputPath) {
        Set-Content -Path $RawOutputPath -Value $rawOutput -Encoding UTF8
    }

    if ((-not (Test-OutputContract -Text $cleanOutput -RequestedTaskId $TaskId)) -or (Test-StalePlan -Text $cleanOutput)) {
        $cleanOutput = "BLOCKED"
    }

    if ($OutputPath) {
        Set-Content -Path $OutputPath -Value $cleanOutput -Encoding UTF8
    }

    $cleanOutput
}
finally {
    Remove-Item -LiteralPath $stdinPath -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stderrPath -ErrorAction SilentlyContinue
}
