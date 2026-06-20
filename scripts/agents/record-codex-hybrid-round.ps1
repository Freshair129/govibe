param(
    [Parameter(Mandatory = $false)]
    [string]$MicrotaskId = "MT-A2-04",

    [Parameter(Mandatory = $true)]
    [ValidateSet("codex-only", "hybrid")]
    [string]$Flow,

    [Parameter(Mandatory = $true)]
    [double]$DailyBefore,

    [Parameter(Mandatory = $true)]
    [double]$DailyAfter,

    [Parameter(Mandatory = $true)]
    [double]$WeeklyBefore,

    [Parameter(Mandatory = $true)]
    [double]$WeeklyAfter,

    [Parameter(Mandatory = $false)]
    [string]$SessionId = "default",

    [Parameter(Mandatory = $false)]
    [string]$ModelName,

    [Parameter(Mandatory = $false)]
    [string]$ModeName,

    [Parameter(Mandatory = $false)]
    [Nullable[int]]$ContextTokensUsed,

    [Parameter(Mandatory = $false)]
    [switch]$Reset
)

$measureScript = Join-Path $PSScriptRoot "measure-codex-hybrid-savings.ps1"
$statePath = Join-Path ([System.IO.Path]::GetTempPath()) ("govibe-codex-hybrid-savings-{0}.json" -f $SessionId)

if ($Reset -and (Test-Path -LiteralPath $statePath)) {
    Remove-Item -LiteralPath $statePath -Force
}

$state = [ordered]@{
    session_id = $SessionId
    microtask_id = $MicrotaskId
    rounds = [ordered]@{
        "codex-only" = $null
        "hybrid" = $null
    }
}

if (Test-Path -LiteralPath $statePath) {
    $loaded = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($loaded) {
        $state = [ordered]@{
            session_id = [string]$loaded.session_id
            microtask_id = [string]$loaded.microtask_id
            rounds = [ordered]@{
                "codex-only" = $loaded.rounds.'codex-only'
                "hybrid" = $loaded.rounds.hybrid
            }
        }
    }
}

$state.microtask_id = $MicrotaskId
$state.rounds[$Flow] = [ordered]@{
    daily_before = $DailyBefore
    daily_after = $DailyAfter
    weekly_before = $WeeklyBefore
    weekly_after = $WeeklyAfter
    model_name = $ModelName
    mode_name = $ModeName
    context_tokens_used = $ContextTokensUsed
    recorded_at = (Get-Date).ToString("o")
}

$state | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $statePath -Encoding UTF8

$codexOnly = $state.rounds["codex-only"]
$hybrid = $state.rounds["hybrid"]

if ($null -eq $codexOnly -or $null -eq $hybrid) {
    $missing = if ($null -eq $codexOnly) { "codex-only" } else { "hybrid" }
@"
Saved round: $Flow
Session: $SessionId
State file: $statePath

Current values
- Daily: $DailyBefore -> $DailyAfter
- Weekly: $WeeklyBefore -> $WeeklyAfter
- Model: $(if ($ModelName) { $ModelName } else { "n/a" })
- Mode: $(if ($ModeName) { $ModeName } else { "n/a" })
- Context tokens used: $(if ($null -ne $ContextTokensUsed) { $ContextTokensUsed } else { "n/a" })

Waiting for: $missing

Next command example
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\record-codex-hybrid-round.ps1" -SessionId "$SessionId" -MicrotaskId "$MicrotaskId" -Flow "$missing" -DailyBefore 0 -DailyAfter 0 -WeeklyBefore 0 -WeeklyAfter 0 -ModelName "gpt-5.4" -ModeName "Medium" -ContextTokensUsed 51000
"@
    return
}

$reportJson = powershell -NoProfile -ExecutionPolicy Bypass -File $measureScript `
    -MicrotaskId $MicrotaskId `
    -CodexOnlyDailyBefore $codexOnly.daily_before `
    -CodexOnlyDailyAfter $codexOnly.daily_after `
    -HybridDailyBefore $hybrid.daily_before `
    -HybridDailyAfter $hybrid.daily_after `
    -CodexOnlyWeeklyBefore $codexOnly.weekly_before `
    -CodexOnlyWeeklyAfter $codexOnly.weekly_after `
    -HybridWeeklyBefore $hybrid.weekly_before `
    -HybridWeeklyAfter $hybrid.weekly_after `
    -OutputFormat json

$report = $reportJson | ConvertFrom-Json

@"
Codex Hybrid Savings Round Summary
---------------------------------
Session: $SessionId
Microtask: $MicrotaskId
State file: $statePath

Recorded rounds
- codex-only daily: $($codexOnly.daily_before) -> $($codexOnly.daily_after)
- codex-only weekly: $($codexOnly.weekly_before) -> $($codexOnly.weekly_after)
- codex-only model/mode/context: $(if ($codexOnly.model_name) { $codexOnly.model_name } else { "n/a" }) / $(if ($codexOnly.mode_name) { $codexOnly.mode_name } else { "n/a" }) / $(if ($null -ne $codexOnly.context_tokens_used) { $codexOnly.context_tokens_used } else { "n/a" })
- hybrid daily: $($hybrid.daily_before) -> $($hybrid.daily_after)
- hybrid weekly: $($hybrid.weekly_before) -> $($hybrid.weekly_after)
- hybrid model/mode/context: $(if ($hybrid.model_name) { $hybrid.model_name } else { "n/a" }) / $(if ($hybrid.mode_name) { $hybrid.mode_name } else { "n/a" }) / $(if ($null -ne $hybrid.context_tokens_used) { $hybrid.context_tokens_used } else { "n/a" })

Observed quota savings
- Daily savings: $($report.observed_quota.daily_savings_pct)%
- Weekly savings: $($report.observed_quota.weekly_savings_pct)%

Estimated cost proxy
- Codex-only: $($report.estimated_comparison.codex_only.estimated_cost_usd) USD
- Hybrid: $($report.estimated_comparison.hybrid.estimated_cost_usd) USD
- Estimated savings: $($report.estimated_comparison.savings_pct)%

Tip
- Use -Reset to clear this session and record a fresh pair of rounds.
"@
