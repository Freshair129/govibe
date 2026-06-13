param(
    [Parameter(Mandatory = $false)]
    [string]$AgentId,

    [Parameter(Mandatory = $false)]
    [string]$Scope,

    [Parameter(Mandatory = $true)]
    [string]$Task,

    [Parameter(Mandatory = $false)]
    [ValidateSet("doc", "plan", "audit", "atomic")]
    [string]$Mode = "doc",

    [Parameter(Mandatory = $false)]
    [string]$Registry = ".agents/agent-registry.yaml",

    [Parameter(Mandatory = $false)]
    [int]$MaxFiles = 16,

    [Parameter(Mandatory = $false)]
    [int]$MaxCharsPerFile = 12000,

    [Parameter(Mandatory = $false)]
    [string]$OutputPath,

    [Parameter(Mandatory = $false)]
    [string]$CodexOutputPath,

    [Parameter(Mandatory = $false)]
    [string]$Model,

    [Parameter(Mandatory = $false)]
    [ValidateSet("codex", "ollama")]
    [string]$Executor,

    [Parameter(Mandatory = $false)]
    [string]$LocalModel,

    [Parameter(Mandatory = $false)]
    [ValidateSet("text", "json")]
    [string]$OutputFormat = "text",

    [switch]$InvokeCodex,
    [switch]$CodexJson,
    [switch]$Ephemeral,
    [switch]$RetryLargerLocalModel,
    [switch]$AsJson,
    [switch]$PrintPrompt
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$builder = Join-Path $PSScriptRoot "build-agent-prompt.mjs"

if (-not (Test-Path $builder)) {
    throw "Missing helper script: $builder"
}

function Get-ListValue {
    param([Parameter(Mandatory = $false)]$Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value)
    }

    return @($Value)
}

function Invoke-PromptBuilder {
    param(
        [Parameter(Mandatory = $true)]
        [int]$BuilderMaxFiles,

        [Parameter(Mandatory = $true)]
        [int]$BuilderMaxCharsPerFile
    )

    $nodeArgs = @(
        $builder,
        "--root", $repoRoot,
        "--registry", $Registry,
        "--task", $Task,
        "--mode", $Mode,
        "--maxFiles", $BuilderMaxFiles,
        "--maxCharsPerFile", $BuilderMaxCharsPerFile,
        "--json"
    )

    if ($AgentId) {
        $nodeArgs += @("--agent", $AgentId)
    }

    if ($Scope) {
        $nodeArgs += @("--scope", $Scope)
    }

    $raw = & node @nodeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build agent prompt."
    }

    return ($raw | ConvertFrom-Json)
}

function Get-NestedProperty {
    param(
        [Parameter(Mandatory = $false)]$Object,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    $prop = $Object.PSObject.Properties[$Name]
    if ($null -eq $prop) {
        return $null
    }

    return $prop.Value
}

function Resolve-ExecutorName {
    param(
        [Parameter(Mandatory = $true)]$BuilderResult
    )

    if ($InvokeCodex -and $Executor -and $Executor -ne "codex") {
        throw "InvokeCodex cannot be combined with -Executor $Executor."
    }

    if ($Executor) {
        return $Executor
    }

    if ($InvokeCodex) {
        return "codex"
    }

    $scopePreferred = Get-NestedProperty (Get-NestedProperty $BuilderResult "scopeExecutionPolicy") "preferred_executor"
    if ($scopePreferred) {
        return [string]$scopePreferred
    }

    $agentDefault = Get-NestedProperty (Get-NestedProperty $BuilderResult "agentExecutionPolicy") "default_executor"
    if ($agentDefault) {
        return [string]$agentDefault
    }

    $globalDefault = Get-NestedProperty (Get-NestedProperty $BuilderResult "executorDefaults") "default"
    if ($globalDefault) {
        return [string]$globalDefault
    }

    return "codex"
}

function Test-ExecutorAllowed {
    param(
        [Parameter(Mandatory = $true)]$BuilderResult,
        [Parameter(Mandatory = $true)][string]$ExecutorName
    )

    $executorConfig = Get-NestedProperty (Get-NestedProperty $BuilderResult "executors") $ExecutorName
    $executorAllowedModes = Get-ListValue (Get-NestedProperty $executorConfig "allowed_modes")
    if ($executorAllowedModes.Count -gt 0 -and -not ($executorAllowedModes -contains $Mode)) {
        throw "Executor '$ExecutorName' is not allowed for mode '$Mode'."
    }

    $agentAllowed = Get-ListValue (Get-NestedProperty (Get-NestedProperty $BuilderResult "agentExecutionPolicy") "allowed_executors")
    if ($agentAllowed.Count -gt 0 -and -not ($agentAllowed -contains $ExecutorName)) {
        throw "Executor '$ExecutorName' is not allowed for agent '$($BuilderResult.agent)'."
    }

    $scopeAllowed = Get-ListValue (Get-NestedProperty (Get-NestedProperty $BuilderResult "scopeExecutionPolicy") "allowed_executors")
    if ($scopeAllowed.Count -gt 0 -and -not ($scopeAllowed -contains $ExecutorName)) {
        throw "Executor '$ExecutorName' is not allowed for scope '$($BuilderResult.scope)'."
    }
}

function Resolve-LocalPolicy {
    param(
        [Parameter(Mandatory = $true)]$BuilderResult
    )

    $localSidecar = Get-NestedProperty $BuilderResult "localSidecar"
    if (-not (Get-NestedProperty $localSidecar "enabled")) {
        throw "Local sidecar execution is disabled in the registry."
    }

    $allowedModes = Get-ListValue (Get-NestedProperty $localSidecar "allowed_modes")
    if ($allowedModes.Count -gt 0 -and -not ($allowedModes -contains $Mode)) {
        throw "Local sidecar execution only supports modes: $($allowedModes -join ', ')."
    }

    $scopeModePolicy = Get-NestedProperty (Get-NestedProperty $BuilderResult "scopeExecutionPolicy") "local_mode_policy"
    if ($scopeModePolicy -eq "atomic_only" -and $Mode -ne "atomic") {
        throw "Scope '$($BuilderResult.scope)' only allows local sidecar execution for atomic mode."
    }

    # Dynamic Constraint Injection based on Tier
    $scopeTier = Get-NestedProperty (Get-NestedProperty $BuilderResult "scopeExecutionPolicy") "local_model_tier"
    $agentTier = Get-NestedProperty (Get-NestedProperty $BuilderResult "agentExecutionPolicy") "local_model_tier"
    $selectedTier = if ($scopeTier) { [string]$scopeTier } elseif ($agentTier) { [string]$agentTier } else { "default" }
    
    $tierConstraints = Get-NestedProperty $localSidecar "tier_constraints"
    $tierLimit = Get-NestedProperty $tierConstraints $selectedTier
    if ($tierLimit) {
        $localSidecar.max_chars_per_file = [int]$tierLimit
    }

    return $localSidecar
}

function Resolve-LocalModelName {
    param(
        [Parameter(Mandatory = $true)]$BuilderResult
    )

    if ($LocalModel) {
        return $LocalModel
    }

    $localSidecar = Get-NestedProperty $BuilderResult "localSidecar"
    $modelTiers = Get-NestedProperty $localSidecar "model_tiers"
    $scopeTier = Get-NestedProperty (Get-NestedProperty $BuilderResult "scopeExecutionPolicy") "local_model_tier"
    $agentTier = Get-NestedProperty (Get-NestedProperty $BuilderResult "agentExecutionPolicy") "local_model_tier"
    $selectedTier = if ($scopeTier) { [string]$scopeTier } elseif ($agentTier) { [string]$agentTier } else { "default" }
    $tierModel = Get-NestedProperty $modelTiers $selectedTier
    if ($tierModel) {
        return [string]$tierModel
    }

    $defaultModel = Get-NestedProperty $modelTiers "default"
    if ($defaultModel) {
        return [string]$defaultModel
    }

    throw "No local model could be resolved from the registry."
}

function Get-LocalRetryModel {
    param(
        [Parameter(Mandatory = $true)]$BuilderResult,
        [Parameter(Mandatory = $true)][string]$SelectedModel
    )

    $modelTiers = Get-NestedProperty (Get-NestedProperty $BuilderResult "localSidecar") "model_tiers"
    $retryModel = Get-NestedProperty $modelTiers "retry"
    if (-not $retryModel) {
        return $null
    }

    if ([string]$retryModel -eq $SelectedModel) {
        return $null
    }

    return [string]$retryModel
}

function Format-OllamaPrompt {
    param(
        [Parameter(Mandatory = $true)][string]$PromptText,
        [Parameter(Mandatory = $true)]$BuilderResult
    )

    $contextFiles = Get-ListValue (Get-NestedProperty $BuilderResult "contextFiles")

    if ($OutputFormat -eq "json") {
        return @"
$PromptText

Execution rules for this local sidecar run:
- You are a bounded local subagent running through Ollama.
- Use only the injected context and do not invent repository knowledge beyond it.
- If the task exceeds your confidence or context, say so in the assumptions_or_blockers field.
- Respond with valid JSON only.

Required JSON shape:
{
  "task_summary": "short summary",
  "assumptions_or_blockers": ["item 1", "item 2"],
  "files_inspected": ["path/one", "path/two"],
  "recommended_next_step": "single next step"
}

Files inspected candidate set:
$(($contextFiles | ForEach-Object { "- $_" }) -join "`n")
"@
    }

    return @"
$PromptText

Execution rules for this local sidecar run:
- You are a bounded local subagent running through Ollama.
- Use only the injected context and do not invent repository knowledge beyond it.
- If the task exceeds your confidence or context, state that clearly.
- Respond using exactly these sections:
  Task Summary
  Assumptions or Blockers
  Files Inspected
  Recommended Next Step

Files inspected candidate set:
$(($contextFiles | ForEach-Object { "- $_" }) -join "`n")
"@
}

function Invoke-OllamaAttempt {
    param(
        [Parameter(Mandatory = $true)][string]$SelectedModel,
        [Parameter(Mandatory = $true)][string]$PromptText
    )

    $stdinPath = Join-Path $env:TEMP ("ollama-agent-stdin-" + [guid]::NewGuid().ToString() + ".txt")
    $stderrPath = Join-Path $env:TEMP ("ollama-agent-stderr-" + [guid]::NewGuid().ToString() + ".txt")
    try {
        # Use UTF8 without BOM for compatibility
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($stdinPath, $PromptText, $utf8NoBom)

        # Use Get-Content -Raw to read the whole file and pipe it, 
        # which is often more stable for large buffers than direct variable piping
        $stdout = Get-Content -Raw -Path $stdinPath | & ollama run $SelectedModel 2> $stderrPath
        
        $stdoutText = ($stdout | Out-String).Trim()
        $stderrText = if (Test-Path $stderrPath) { (Get-Content -Path $stderrPath | Out-String).Trim() } else { "" }
        return [pscustomobject]@{
            Success = ($LASTEXITCODE -eq 0) -and -not [string]::IsNullOrWhiteSpace($stdoutText)
            ExitCode = $LASTEXITCODE
            Output = $stdoutText
            Error = $stderrText
            Model = $SelectedModel
        }
    }
    finally {
        Remove-Item -LiteralPath $stdinPath -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrPath -ErrorAction SilentlyContinue
    }
}

function New-LocalEscalationText {
    param(
        [Parameter(Mandatory = $true)]$BuilderResult,
        [Parameter(Mandatory = $true)][string]$PrimaryModel,
        [Parameter(Mandatory = $false)][string]$RetryModel,
        [Parameter(Mandatory = $false)][string]$PrimaryError,
        [Parameter(Mandatory = $false)][string]$RetryError
    )

    $filesInspected = Get-ListValue (Get-NestedProperty $BuilderResult "contextFiles")
    $errorParts = @()
    if ($PrimaryError) {
        $errorParts += "Primary model ($PrimaryModel): $PrimaryError"
    }
    if ($RetryModel -and $RetryError) {
        $errorParts += "Retry model ($RetryModel): $RetryError"
    }
    $errorSummary = if ($errorParts.Count -gt 0) { $errorParts -join " | " } else { "No diagnostics captured." }

    if ($OutputFormat -eq "json") {
        return (@{
                task_summary = "Local sidecar execution could not complete the requested atomic task."
                assumptions_or_blockers = @(
                    "Ollama sidecar failed after bounded retry."
                    $errorSummary
                )
                files_inspected = $filesInspected
                recommended_next_step = "Escalate this task back to Codex or another higher-context executor with the same injected files."
            } | ConvertTo-Json -Depth 5)
    }

    return @"
Task Summary
Local sidecar execution could not complete the requested atomic task.

Assumptions or Blockers
- Ollama sidecar failed after bounded retry.
- $errorSummary

Files Inspected
$(($filesInspected | ForEach-Object { "- $_" }) -join "`n")

Recommended Next Step
Escalate this task back to Codex or another higher-context executor with the same injected files.
"@
}

$initialBuilderResult = Invoke-PromptBuilder -BuilderMaxFiles $MaxFiles -BuilderMaxCharsPerFile $MaxCharsPerFile
$selectedExecutor = Resolve-ExecutorName -BuilderResult $initialBuilderResult
Test-ExecutorAllowed -BuilderResult $initialBuilderResult -ExecutorName $selectedExecutor

$builderResult = $initialBuilderResult
if ($selectedExecutor -eq "ollama") {
    $localPolicy = Resolve-LocalPolicy -BuilderResult $initialBuilderResult

    $effectiveMaxFiles = $MaxFiles
    $effectiveMaxCharsPerFile = $MaxCharsPerFile

    if (-not $PSBoundParameters.ContainsKey("MaxFiles")) {
        $policyMaxFiles = Get-NestedProperty $localPolicy "max_files"
        if ($policyMaxFiles) {
            $effectiveMaxFiles = [int]$policyMaxFiles
        }
    }

    if (-not $PSBoundParameters.ContainsKey("MaxCharsPerFile")) {
        $policyMaxChars = Get-NestedProperty $localPolicy "max_chars_per_file"
        if ($policyMaxChars) {
            $effectiveMaxCharsPerFile = [int]$policyMaxChars
        }
    }

    if ($effectiveMaxFiles -ne $MaxFiles -or $effectiveMaxCharsPerFile -ne $MaxCharsPerFile) {
        $builderResult = Invoke-PromptBuilder -BuilderMaxFiles $effectiveMaxFiles -BuilderMaxCharsPerFile $effectiveMaxCharsPerFile
        Test-ExecutorAllowed -BuilderResult $builderResult -ExecutorName $selectedExecutor
        $null = Resolve-LocalPolicy -BuilderResult $builderResult
    }
}

$promptText = [string](Get-NestedProperty $builderResult "prompt")
$shouldExecute = $InvokeCodex -or $Executor -or ($selectedExecutor -eq "ollama")

if ($OutputPath) {
    if ($AsJson) {
        Set-Content -Path $OutputPath -Value ($builderResult | ConvertTo-Json -Depth 10)
    }
    else {
        Set-Content -Path $OutputPath -Value $promptText
    }
}

if (($PrintPrompt -or -not $OutputPath) -and -not $shouldExecute) {
    if ($AsJson) {
        $builderResult | ConvertTo-Json -Depth 10
    }
    else {
        $promptText
    }
}

if (-not $shouldExecute) {
    return
}

if ($selectedExecutor -eq "codex") {
    $effectiveCodexOutputPath = $CodexOutputPath
    if (-not $effectiveCodexOutputPath) {
        $effectiveCodexOutputPath = Join-Path $env:TEMP ("codex-agent-output-" + [guid]::NewGuid().ToString() + ".txt")
    }

    $codexArgs = @(
        "--ask-for-approval", "never",
        "exec",
        "-",
        "--cd", $repoRoot,
        "--sandbox", "workspace-write",
        "--output-last-message", $effectiveCodexOutputPath
    )

    if ($Model) {
        $codexArgs += @("--model", $Model)
    }

    if ($CodexJson) {
        $codexArgs += "--json"
    }

    if ($Ephemeral) {
        $codexArgs += "--ephemeral"
    }

    $codexLog = $promptText | & codex @codexArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        $logText = ($codexLog | Out-String).Trim()
        throw "Codex exec failed.`n$logText"
    }

    if (-not (Test-Path $effectiveCodexOutputPath)) {
        throw "Codex exec completed but no output message file was created: $effectiveCodexOutputPath"
    }

    Get-Content -Path $effectiveCodexOutputPath

    if (-not $CodexOutputPath) {
        Remove-Item -LiteralPath $effectiveCodexOutputPath -ErrorAction SilentlyContinue
    }

    return
}

if ($selectedExecutor -eq "ollama") {
    $selectedModel = Resolve-LocalModelName -BuilderResult $builderResult
    $retryModel = Get-LocalRetryModel -BuilderResult $builderResult -SelectedModel $selectedModel
    $ollamaPrompt = Format-OllamaPrompt -PromptText $promptText -BuilderResult $builderResult

    $primaryAttempt = Invoke-OllamaAttempt -SelectedModel $selectedModel -PromptText $ollamaPrompt
    if ($primaryAttempt.Success) {
        $primaryAttempt.Output
        return
    }

    $shouldRetry = $RetryLargerLocalModel -or $retryModel
    if ($shouldRetry -and $retryModel) {
        $retryAttempt = Invoke-OllamaAttempt -SelectedModel $retryModel -PromptText $ollamaPrompt
        if ($retryAttempt.Success) {
            $retryAttempt.Output
            return
        }

        New-LocalEscalationText `
            -BuilderResult $builderResult `
            -PrimaryModel $selectedModel `
            -RetryModel $retryModel `
            -PrimaryError $primaryAttempt.Error `
            -RetryError $retryAttempt.Error
        return
    }

    New-LocalEscalationText `
        -BuilderResult $builderResult `
        -PrimaryModel $selectedModel `
        -PrimaryError $primaryAttempt.Error
    return
}

throw "Unsupported executor: $selectedExecutor"
