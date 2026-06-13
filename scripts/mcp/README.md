# GoVibe MCP Skeleton

This folder contains the first GoVibe MCP server scaffold.

Current scope:

- `govibe.agent.run`
- `govibe.docs.resolve`
- `govibe.roadmap.load`
- `govibe.roadmap.update`
- `govibe.deploy.vercel`

The scaffold is intentionally thin:

- stdio JSON-RPC framing
- tool and resource registry
- placeholder handlers aligned to PRD/SRS/LLD
- local document resource reads for approved SSOT docs

Next implementation steps:

1. bind `govibe.agent.run` to the existing registry-driven launcher flow
2. bind roadmap operations to mission event and document-derived state adapters
3. bind deploy operations to governed GitHub and Vercel adapters
4. connect RBAC and ABAC evaluation into tool execution
