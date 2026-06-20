param(
    [Parameter(Mandatory = $false)]
    [string]$Scope,

    [Parameter(Mandatory = $true)]
    [string]$Task,

    [Parameter(Mandatory = $false)]
    [ValidateSet("doc", "plan", "audit", "atomic")]
    [string]$Mode = "audit",

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
$args = @{
    AgentId = "ather"
    Task = $Task
    Mode = $Mode
    Registry = $Registry
    MaxFiles = $MaxFiles
    MaxCharsPerFile = $MaxCharsPerFile
    OutputFormat = $OutputFormat
    InvokeCodex = $InvokeCodex
    CodexJson = $CodexJson
    Ephemeral = $Ephemeral
    RetryLargerLocalModel = $RetryLargerLocalModel
    AsJson = $AsJson
    PrintPrompt = $PrintPrompt
}

if ($PSBoundParameters.ContainsKey("Scope")) { $args.Scope = $Scope }
if ($PSBoundParameters.ContainsKey("OutputPath")) { $args.OutputPath = $OutputPath }
if ($PSBoundParameters.ContainsKey("CodexOutputPath")) { $args.CodexOutputPath = $CodexOutputPath }
if ($PSBoundParameters.ContainsKey("Model")) { $args.Model = $Model }
if ($PSBoundParameters.ContainsKey("Executor")) { $args.Executor = $Executor }
if ($PSBoundParameters.ContainsKey("LocalModel")) { $args.LocalModel = $LocalModel }

& $invokeScript @args
