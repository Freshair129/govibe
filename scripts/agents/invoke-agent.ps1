param(
    [Parameter(Mandatory = $false)]
    [string]$Agent,

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

    [switch]$InvokeCodex,
    [switch]$CodexJson,
    [switch]$Ephemeral,

    [switch]$AsJson,
    [switch]$PrintPrompt
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$builder = Join-Path $PSScriptRoot "build-agent-prompt.mjs"

if (-not (Test-Path $builder)) {
    throw "Missing helper script: $builder"
}

$nodeArgs = @(
    $builder,
    "--root", $repoRoot,
    "--registry", $Registry,
    "--task", $Task,
    "--mode", $Mode,
    "--maxFiles", $MaxFiles,
    "--maxCharsPerFile", $MaxCharsPerFile
)

if ($Agent) {
    $nodeArgs += @("--agent", $Agent)
}

if ($Scope) {
    $nodeArgs += @("--scope", $Scope)
}

if ($AsJson) {
    $nodeArgs += "--json"
}

$result = & node @nodeArgs
if ($LASTEXITCODE -ne 0) {
    throw "Failed to build agent prompt."
}

if ($OutputPath) {
    Set-Content -Path $OutputPath -Value $result
}

if (($PrintPrompt -or -not $OutputPath) -and -not $InvokeCodex) {
    $result
}

if ($InvokeCodex) {
    if ($AsJson) {
        $parsed = $result | ConvertFrom-Json
        $promptText = $parsed.prompt
    }
    else {
        $promptText = $result
    }

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
}
