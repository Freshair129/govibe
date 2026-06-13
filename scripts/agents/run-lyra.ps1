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

    [switch]$InvokeCodex,
    [switch]$CodexJson,
    [switch]$Ephemeral,
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
    -InvokeCodex:$InvokeCodex `
    -CodexJson:$CodexJson `
    -Ephemeral:$Ephemeral `
    -AsJson:$AsJson `
    -PrintPrompt:$PrintPrompt

