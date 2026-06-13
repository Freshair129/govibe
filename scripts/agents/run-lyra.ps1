param(
    [Parameter(Mandatory = $false)]
    [string]$Scope,

    [Parameter(Mandatory = $true)]
    [string]$Task,

    [Parameter(Mandatory = $false)]
    [ValidateSet("doc", "plan", "audit", "atomic")]
    [string]$Mode = "plan",

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

$invokeScript = Join-Path $PSScriptRoot "invoke-agent.ps1"

& $invokeScript `
    -Agent "lyra" `
    -Scope $Scope `
    -Task $Task `
    -Mode $Mode `
    -Registry $Registry `
    -MaxFiles $MaxFiles `
    -MaxCharsPerFile $MaxCharsPerFile `
    -OutputPath $OutputPath `
    -CodexOutputPath $CodexOutputPath `
    -Model $Model `
    -Executor $Executor `
    -LocalModel $LocalModel `
    -OutputFormat $OutputFormat `
    -InvokeCodex:$InvokeCodex `
    -CodexJson:$CodexJson `
    -Ephemeral:$Ephemeral `
    -RetryLargerLocalModel:$RetryLargerLocalModel `
    -AsJson:$AsJson `
    -PrintPrompt:$PrintPrompt
