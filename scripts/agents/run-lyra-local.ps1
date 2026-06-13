param(
    [Parameter(Mandatory = $false)]
    [string]$Scope,

    [Parameter(Mandatory = $true)]
    [string]$Task,

    [Parameter(Mandatory = $false)]
    [ValidateSet("atomic")]
    [string]$Mode = "atomic",

    [Parameter(Mandatory = $false)]
    [string]$Registry = ".agents/agent-registry.yaml",

    [Parameter(Mandatory = $false)]
    [int]$MaxFiles = 16,

    [Parameter(Mandatory = $false)]
    [int]$MaxCharsPerFile = 12000,

    [Parameter(Mandatory = $false)]
    [string]$OutputPath,

    [Parameter(Mandatory = $false)]
    [string]$LocalModel,

    [Parameter(Mandatory = $false)]
    [ValidateSet("text", "json")]
    [string]$OutputFormat = "text",

    [switch]$RetryLargerLocalModel,
    [switch]$AsJson,
    [switch]$PrintPrompt
)

$invokeScript = Join-Path $PSScriptRoot "invoke-agent.ps1"

& $invokeScript `
    -AgentId "lyra" `
    -Scope $Scope `
    -Task $Task `
    -Mode $Mode `
    -Registry $Registry `
    -MaxFiles $MaxFiles `
    -MaxCharsPerFile $MaxCharsPerFile `
    -OutputPath $OutputPath `
    -Executor "ollama" `
    -LocalModel $LocalModel `
    -OutputFormat $OutputFormat `
    -RetryLargerLocalModel:$RetryLargerLocalModel `
    -AsJson:$AsJson `
    -PrintPrompt:$PrintPrompt
