# Block Decomposition 1.0.0

```json
{
  "schema": "govibe-skill-definition/v1",
  "id": "block-decomposition",
  "version": "1.0.0",
  "aliases": [
    "scan",
    "deep-scan"
  ],
  "inputSchema": {
    "type": "object",
    "required": [
      "workspacePath"
    ]
  },
  "outputSchema": {
    "type": "object",
    "required": [
      "runId",
      "status"
    ]
  },
  "permissions": [
    "workspace:read",
    "msp:context",
    "msp:proof",
    "gks:knowledge"
  ],
  "stageHooks": [
    { "stage": 1, "handler": "scan" },
    { "stage": 2, "handler": "structure" },
    { "stage": 3, "handler": "markdown-parse" },
    { "stage": 4, "handler": "cobol-parse" },
    { "stage": 5, "handler": "symbolic-parse" },
    { "stage": 6, "handler": "routes" },
    { "stage": 7, "handler": "tools" },
    { "stage": 8, "handler": "orm" },
    { "stage": 9, "handler": "cross-file-resolution" },
    { "stage": 10, "handler": "mro" },
    { "stage": 11, "handler": "communities" },
    { "stage": 12, "handler": "processes" }
  ],
  "verificationRequirements": [
    "canonical-stage-order",
    "stage-evidence",
    "graph-validation"
  ],
  "contentHash": "sha256:b2b948828125b9584b309e39f6a90be69866202e63208ba2767d69bfdf3b0112"
}
```
