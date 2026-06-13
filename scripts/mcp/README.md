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
- shared runtime core for MCP and Mission Control
- local document resource reads for approved SSOT docs
- HTTP snapshot/command sidecar
- WebSocket mission event stream

Next implementation steps:

1. connect roadmap mutation UI controls to the live overlay endpoints
2. bind deploy operations to governed GitHub and Vercel adapters
3. connect RBAC and ABAC evaluation into tool execution
