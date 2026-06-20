param(
    [Parameter(Mandatory = $false)]
    [string]$MicrotaskId = "MT-A2-04",

    [Parameter(Mandatory = $false)]
    [string]$PlanTask = "Create a roadmap decomposition for the current system",

    [Parameter(Mandatory = $false)]
    [string]$CodexCodingTask = "Implement the requested frontend change in the current approved scope.",

    [Parameter(Mandatory = $false)]
    [string]$ReviewTask = "Audit the current implementation diff for drift, regressions, and smallest-safe-fix recommendations.",

    [Parameter(Mandatory = $false)]
    [string]$HotfixTask = "Apply a small hot fix inside the current approved frontend scope only.",

    [Parameter(Mandatory = $false)]
    [double]$InputPricePerMillion = 4.0,

    [Parameter(Mandatory = $false)]
    [double]$OutputPricePerMillion = 24.0,

    [Parameter(Mandatory = $false)]
    [int]$PlanOutputTokens = 2000,

    [Parameter(Mandatory = $false)]
    [int]$CodexCodingOutputTokens = 5000,

    [Parameter(Mandatory = $false)]
    [int]$ReviewOutputTokens = 1000,

    [Parameter(Mandatory = $false)]
    [int]$HotfixOutputTokens = 1000,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$CodexOnlyDailyBefore,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$CodexOnlyDailyAfter,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$HybridDailyBefore,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$HybridDailyAfter,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$CodexOnlyWeeklyBefore,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$CodexOnlyWeeklyAfter,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$HybridWeeklyBefore,

    [Parameter(Mandatory = $false)]
    [Nullable[double]]$HybridWeeklyAfter,

    [Parameter(Mandatory = $false)]
    [ValidateSet("text", "json")]
    [string]$OutputFormat = "text"
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$invokeAgent = Join-Path $PSScriptRoot "invoke-agent.ps1"
$runVibeMicrotask = Join-Path $PSScriptRoot "run-vibe-microtask-local.ps1"

function Get-PromptLength {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    $raw = Invoke-Expression $Command | Out-String
    return ($raw.TrimEnd("`r", "`n")).Length
}

function Convert-CharsToTokens {
    param([Parameter(Mandatory = $true)][int]$Chars)
    return [math]::Round($Chars / 4.0, 0)
}

function Get-CostUsd {
    param(
        [Parameter(Mandatory = $true)][double]$InputTokens,
        [Parameter(Mandatory = $true)][double]$OutputTokens
    )

    return (($InputTokens * $InputPricePerMillion) + ($OutputTokens * $OutputPricePerMillion)) / 1000000.0
}

function Get-UsageDelta {
    param(
        [Parameter(Mandatory = $false)][Nullable[double]]$Before,
        [Parameter(Mandatory = $false)][Nullable[double]]$After
    )

    if ($null -ne $Before -and $null -ne $After) {
        return [math]::Round(($Before - $After), 2)
    }

    return $null
}

$planPromptChars = Get-PromptLength "powershell -NoProfile -ExecutionPolicy Bypass -File `"$invokeAgent`" -AgentId lyra -Scope `"docs/features/project-roadmap`" -Task `"$PlanTask`" -Mode plan -PrintPrompt"
$localCodingPromptChars = Get-PromptLength "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runVibeMicrotask`" -TaskId `"$MicrotaskId`" -Profile `"balanced`" -PrintPrompt"
$codexCodingPromptChars = Get-PromptLength "powershell -NoProfile -ExecutionPolicy Bypass -File `"$invokeAgent`" -AgentId vibe -Scope `"src/`" -Task `"$CodexCodingTask`" -Mode atomic -PrintPrompt"
$reviewPromptChars = Get-PromptLength "powershell -NoProfile -ExecutionPolicy Bypass -File `"$invokeAgent`" -AgentId ather -Scope `"src/`" -Task `"$ReviewTask`" -Mode audit -PrintPrompt"
$hotfixPromptChars = Get-PromptLength "powershell -NoProfile -ExecutionPolicy Bypass -File `"$invokeAgent`" -AgentId vibe -Scope `"src/`" -Task `"$HotfixTask`" -Mode atomic -PrintPrompt"

$planPromptTokens = Convert-CharsToTokens $planPromptChars
$localCodingPromptTokens = Convert-CharsToTokens $localCodingPromptChars
$codexCodingPromptTokens = Convert-CharsToTokens $codexCodingPromptChars
$reviewPromptTokens = Convert-CharsToTokens $reviewPromptChars
$hotfixPromptTokens = Convert-CharsToTokens $hotfixPromptChars

$codexOnlyInputTokens = $planPromptTokens + $codexCodingPromptTokens
$hybridCodexInputTokens = $planPromptTokens + $reviewPromptTokens + $hotfixPromptTokens

$codexOnlyOutputTokens = $PlanOutputTokens + $CodexCodingOutputTokens
$hybridCodexOutputTokens = $PlanOutputTokens + $ReviewOutputTokens + $HotfixOutputTokens

$codexOnlyCost = Get-CostUsd -InputTokens $codexOnlyInputTokens -OutputTokens $codexOnlyOutputTokens
$hybridCost = Get-CostUsd -InputTokens $hybridCodexInputTokens -OutputTokens $hybridCodexOutputTokens
$estimatedSavingsPct = if ($codexOnlyCost -gt 0) {
    [math]::Round((($codexOnlyCost - $hybridCost) / $codexOnlyCost) * 100.0, 1)
} else {
    0
}

$dailyCodexOnlyDelta = Get-UsageDelta -Before $CodexOnlyDailyBefore -After $CodexOnlyDailyAfter
$dailyHybridDelta = Get-UsageDelta -Before $HybridDailyBefore -After $HybridDailyAfter
$weeklyCodexOnlyDelta = Get-UsageDelta -Before $CodexOnlyWeeklyBefore -After $CodexOnlyWeeklyAfter
$weeklyHybridDelta = Get-UsageDelta -Before $HybridWeeklyBefore -After $HybridWeeklyAfter

$actualDailySavingsPct = if ($null -ne $dailyCodexOnlyDelta -and $null -ne $dailyHybridDelta -and $dailyCodexOnlyDelta -gt 0) {
    [math]::Round((($dailyCodexOnlyDelta - $dailyHybridDelta) / $dailyCodexOnlyDelta) * 100.0, 1)
} else {
    $null
}

$actualWeeklySavingsPct = if ($null -ne $weeklyCodexOnlyDelta -and $null -ne $weeklyHybridDelta -and $weeklyCodexOnlyDelta -gt 0) {
    [math]::Round((($weeklyCodexOnlyDelta - $weeklyHybridDelta) / $weeklyCodexOnlyDelta) * 100.0, 1)
} else {
    $null
}

$report = [ordered]@{
    experiment = [ordered]@{
        microtask_id = $MicrotaskId
        pricing = [ordered]@{
            input_per_million = $InputPricePerMillion
            output_per_million = $OutputPricePerMillion
        }
    }
    prompt_footprint = [ordered]@{
        plan_chars = $planPromptChars
        local_coding_chars = $localCodingPromptChars
        codex_coding_chars = $codexCodingPromptChars
        review_chars = $reviewPromptChars
        hotfix_chars = $hotfixPromptChars
        plan_tokens_est = $planPromptTokens
        local_coding_tokens_est = $localCodingPromptTokens
        codex_coding_tokens_est = $codexCodingPromptTokens
        review_tokens_est = $reviewPromptTokens
        hotfix_tokens_est = $hotfixPromptTokens
    }
    estimated_comparison = [ordered]@{
        codex_only = [ordered]@{
            input_tokens = $codexOnlyInputTokens
            output_tokens = $codexOnlyOutputTokens
            estimated_cost_usd = [math]::Round($codexOnlyCost, 4)
        }
        hybrid = [ordered]@{
            codex_input_tokens = $hybridCodexInputTokens
            local_coding_tokens = $localCodingPromptTokens
            codex_output_tokens = $hybridCodexOutputTokens
            estimated_cost_usd = [math]::Round($hybridCost, 4)
        }
        savings_pct = $estimatedSavingsPct
    }
    observed_quota = [ordered]@{
        codex_only_daily_delta = $dailyCodexOnlyDelta
        hybrid_daily_delta = $dailyHybridDelta
        daily_savings_pct = $actualDailySavingsPct
        codex_only_weekly_delta = $weeklyCodexOnlyDelta
        hybrid_weekly_delta = $weeklyHybridDelta
        weekly_savings_pct = $actualWeeklySavingsPct
    }
}

if ($OutputFormat -eq "json") {
    $report | ConvertTo-Json -Depth 8
    return
}

@"
Codex Hybrid Savings Report
---------------------------
Microtask: $MicrotaskId

Prompt footprint (chars / est tokens)
- Plan: $planPromptChars / $planPromptTokens
- Local coding: $localCodingPromptChars / $localCodingPromptTokens
- Codex coding: $codexCodingPromptChars / $codexCodingPromptTokens
- Codex review: $reviewPromptChars / $reviewPromptTokens
- Codex hotfix: $hotfixPromptChars / $hotfixPromptTokens

Estimated comparison
- Codex-only input tokens: $codexOnlyInputTokens
- Hybrid Codex input tokens: $hybridCodexInputTokens
- Codex-only output tokens: $codexOnlyOutputTokens
- Hybrid Codex output tokens: $hybridCodexOutputTokens
- Codex-only estimated cost: $([math]::Round($codexOnlyCost, 4)) USD
- Hybrid estimated cost: $([math]::Round($hybridCost, 4)) USD
- Estimated savings: $estimatedSavingsPct%

Observed quota deltas (fill before/after values to activate)
- Codex-only daily delta: $(if ($null -ne $dailyCodexOnlyDelta) { $dailyCodexOnlyDelta } else { "n/a" })
- Hybrid daily delta: $(if ($null -ne $dailyHybridDelta) { $dailyHybridDelta } else { "n/a" })
- Daily savings: $(if ($null -ne $actualDailySavingsPct) { "$actualDailySavingsPct%" } else { "n/a" })
- Codex-only weekly delta: $(if ($null -ne $weeklyCodexOnlyDelta) { $weeklyCodexOnlyDelta } else { "n/a" })
- Hybrid weekly delta: $(if ($null -ne $weeklyHybridDelta) { $weeklyHybridDelta } else { "n/a" })
- Weekly savings: $(if ($null -ne $actualWeeklySavingsPct) { "$actualWeeklySavingsPct%" } else { "n/a" })
"@
