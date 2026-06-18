param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("codex-only", "hybrid")]
    [string]$Flow,

    [Parameter(Mandatory = $false)]
    [string]$SessionId,

    [Parameter(Mandatory = $false)]
    [string]$MicrotaskId = "MT-A2-04",

    [Parameter(Mandatory = $false)]
    [ValidateSet("fast", "balanced", "ui-heavy")]
    [string]$LocalProfile = "balanced",

    [Parameter(Mandatory = $false)]
    [switch]$Reset,

    [Parameter(Mandatory = $false)]
    [switch]$SkipPlan,

    [Parameter(Mandatory = $false)]
    [switch]$SkipReview,

    [Parameter(Mandatory = $false)]
    [switch]$SkipHotfix
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$recordScript = Join-Path $PSScriptRoot "record-codex-hybrid-round.ps1"
$runLyraScript = Join-Path $PSScriptRoot "run-lyra.ps1"
$invokeAgentScript = Join-Path $PSScriptRoot "invoke-agent.ps1"
$runVibeMicrotaskScript = Join-Path $PSScriptRoot "run-vibe-microtask-local.ps1"

$defaultPlanTask = "Create a roadmap decomposition for the current system"
$defaultCodexCodingTask = "Implement the requested frontend change in the current approved scope."
$defaultReviewTask = "Audit the current implementation diff for drift, regressions, and smallest-safe-fix recommendations."
$defaultHotfixTask = "Apply a small hot fix inside the current approved frontend scope only."

function Test-CodexAvailable {
    $cmd = Get-Command codex -ErrorAction SilentlyContinue
    if ($null -eq $cmd) {
        $cmd = Get-Command codex.exe -ErrorAction SilentlyContinue
    }

    if ($null -ne $cmd -and -not [string]::IsNullOrWhiteSpace($cmd.Source)) {
        return $cmd.Source
    }

    if ($null -ne $cmd -and -not [string]::IsNullOrWhiteSpace($cmd.Definition)) {
        return $cmd.Definition
    }

    try {
        $whereHits = @(where.exe codex 2>$null) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        foreach ($hit in $whereHits) {
            if (Test-Path -LiteralPath $hit) {
                return $hit
            }
            if (Test-Path -LiteralPath ($hit + ".exe")) {
                return ($hit + ".exe")
            }
        }
    }
    catch {
    }

    $windowsAppsRoot = "C:\Program Files\WindowsApps"
    if (Test-Path -LiteralPath $windowsAppsRoot) {
        $fallback = Get-ChildItem -Path $windowsAppsRoot -Filter "codex.exe" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match "OpenAI\.Codex_.*\\app\\resources\\codex\.exe$" } |
            Sort-Object FullName -Descending |
            Select-Object -First 1

        if ($fallback) {
            return $fallback.FullName
        }
    }

    throw "Codex CLI was not found. Checked Get-Command, where.exe, and WindowsApps OpenAI.Codex install paths."
}

function Read-RequiredValue {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $false)][string]$DefaultValue
    )

    while ($true) {
        $display = if ($DefaultValue) { "$Label [$DefaultValue]" } else { $Label }
        $value = Read-Host $display
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            return $value.Trim()
        }
        if (-not [string]::IsNullOrWhiteSpace($DefaultValue)) {
            return $DefaultValue
        }
        Write-Host "Please enter a value." -ForegroundColor Yellow
    }
}

function Read-RequiredDouble {
    param(
        [Parameter(Mandatory = $true)][string]$Label
    )

    while ($true) {
        $value = Read-Host $Label
        $parsed = 0.0
        if ([double]::TryParse($value, [ref]$parsed)) {
            return $parsed
        }
        Write-Host "Please enter a numeric value." -ForegroundColor Yellow
    }
}

function Read-OptionalInt {
    param(
        [Parameter(Mandatory = $true)][string]$Label
    )

    while ($true) {
        $value = Read-Host "$Label (optional, press Enter to skip)"
        if ([string]::IsNullOrWhiteSpace($value)) {
            return $null
        }

        $parsed = 0
        if ([int]::TryParse($value, [ref]$parsed)) {
            return $parsed
        }
        Write-Host "Please enter an integer or leave blank." -ForegroundColor Yellow
    }
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Title"
    }
}

try {
    if (-not $Flow) {
        while ($true) {
            $flowInput = Read-Host "Flow (codex-only/hybrid)"
            if ($flowInput -in @("codex-only", "hybrid")) {
                $Flow = $flowInput
                break
            }
            Write-Host "Please enter codex-only or hybrid." -ForegroundColor Yellow
        }
    }

    if (-not $SessionId) {
        $defaultSession = "codex-savings-" + (Get-Date -Format "yyyyMMdd-HHmmss")
        $SessionId = Read-RequiredValue -Label "Session ID" -DefaultValue $defaultSession
    }

    Write-Host ""
    Write-Host "GoVibe Codex Savings Round Runner" -ForegroundColor Green
    Write-Host "Flow: $Flow"
    Write-Host "Session: $SessionId"
    Write-Host "Microtask: $MicrotaskId"

    $beforeDaily = Read-RequiredDouble -Label "Daily remaining BEFORE run"
    $beforeWeekly = Read-RequiredDouble -Label "Weekly remaining BEFORE run"

    Write-Host ""
    Write-Host "Starting automated round now..." -ForegroundColor Green
    $codexPath = Test-CodexAvailable
    Write-Host "Codex CLI: $codexPath" -ForegroundColor DarkGray

    if ($Flow -eq "codex-only") {
        if (-not $SkipPlan) {
            Invoke-Step -Title "Codex plan via LYRA" -Action {
                powershell -NoProfile -ExecutionPolicy Bypass -File $runLyraScript `
                    -Scope "docs/features/project-roadmap" `
                    -Task $defaultPlanTask `
                    -Mode "plan" `
                    -InvokeCodex `
                    -Ephemeral
            }
        }

        Invoke-Step -Title "Codex coding via VIBE" -Action {
            powershell -NoProfile -ExecutionPolicy Bypass -File $invokeAgentScript `
                -AgentId "vibe" `
                -Scope "src/" `
                -Task $defaultCodexCodingTask `
                -Mode "atomic" `
                -InvokeCodex `
                -Ephemeral
        }
    }
    else {
        if (-not $SkipPlan) {
            Invoke-Step -Title "Codex plan via LYRA" -Action {
                powershell -NoProfile -ExecutionPolicy Bypass -File $runLyraScript `
                    -Scope "docs/features/project-roadmap" `
                    -Task $defaultPlanTask `
                    -Mode "plan" `
                    -InvokeCodex `
                    -Ephemeral
            }
        }

        Invoke-Step -Title "Local coding via VIBE microtask wrapper" -Action {
            powershell -NoProfile -ExecutionPolicy Bypass -File $runVibeMicrotaskScript `
                -TaskId $MicrotaskId `
                -Profile $LocalProfile
        }

        if (-not $SkipReview) {
            Invoke-Step -Title "Codex review via ATHER" -Action {
                powershell -NoProfile -ExecutionPolicy Bypass -File $invokeAgentScript `
                    -AgentId "ather" `
                    -Scope "src/" `
                    -Task $defaultReviewTask `
                    -Mode "audit" `
                    -InvokeCodex `
                    -Ephemeral
            }
        }

        if (-not $SkipHotfix) {
            Invoke-Step -Title "Codex hotfix via VIBE" -Action {
                powershell -NoProfile -ExecutionPolicy Bypass -File $invokeAgentScript `
                    -AgentId "vibe" `
                    -Scope "src/" `
                    -Task $defaultHotfixTask `
                    -Mode "atomic" `
                    -InvokeCodex `
                    -Ephemeral
            }
        }
    }

    Write-Host ""
    Write-Host "Round finished. Now enter observed AFTER values from Codex Usage remaining." -ForegroundColor Green

    $afterDaily = Read-RequiredDouble -Label "Daily remaining AFTER run"
    $afterWeekly = Read-RequiredDouble -Label "Weekly remaining AFTER run"
    $modelName = Read-RequiredValue -Label "Model name" -DefaultValue "manual-entry"
    $modeName = Read-RequiredValue -Label "Mode / reasoning level" -DefaultValue "manual-entry"
    $contextTokensUsed = Read-OptionalInt -Label "Context window tokens used"

    Write-Host ""
    Write-Host "Saving round and computing comparison if both flows exist..." -ForegroundColor Green

    $recordArgs = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $recordScript,
        "-SessionId", $SessionId,
        "-MicrotaskId", $MicrotaskId,
        "-Flow", $Flow,
        "-DailyBefore", [string]$beforeDaily,
        "-DailyAfter", [string]$afterDaily,
        "-WeeklyBefore", [string]$beforeWeekly,
        "-WeeklyAfter", [string]$afterWeekly,
        "-ModelName", $modelName,
        "-ModeName", $modeName
    )

    if ($null -ne $contextTokensUsed) {
        $recordArgs += @("-ContextTokensUsed", [string]$contextTokensUsed)
    }

    if ($Reset) {
        $recordArgs += "-Reset"
    }

    & powershell @recordArgs

    Write-Host ""
    Write-Host "Done." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "Runner failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Tip: run this from an open PowerShell window to keep the error visible." -ForegroundColor Yellow
    exit 1
}
