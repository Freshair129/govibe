---
title: "Reference: Notion and Jira Connector Requirements for GLS-005"
doc_id: "REFERENCE-NOTION-JIRA-CONNECTOR-REQUIREMENTS"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-17"
owner: "ARCHON"
source_of_truth: true
related_docs:
  - "docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md"
  - "docs/adr/ADR-028-Multi-Tenant-Principal-Scoped-Vault-Binding.md"
  - "docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md"
---

# Reference: Notion and Jira Connector Requirements for GLS-005

## 1. Purpose

Input research for **GLS-005** (`PmAdapter contract: outbound-first plan projection to Notion
and Jira class targets`, `docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md`), which
implements the interoperability decision in ADR-029 §6: GoVibe stays the canonical plan; a
per-team PM tool gets a projection of it, connected by the user through the web UI.

This document is **research, not a design**. It records what each platform's connector
requires so GLS-005's Task Container and Blueprint can be written against real constraints
instead of assumption. Findings below are current as of 2026-08-17; both platforms' OAuth
surfaces change — re-verify against the live docs before implementation.

## 2. Shared connector model

Both platforms use the same shape, and it is the shape GLS-005 should implement once and
reuse per platform:

1. **GoVibe registers one OAuth app per platform** (`client_id`/`client_secret`), not one per
   user. This is vendor-level configuration, checked in as a secret, not user data.
2. **Each user connects their own account** through a web UI "Connect" action: GoVibe sends
   their browser to the platform's authorize URL; the platform sends the browser back to a
   GoVibe redirect URI with a one-time code; GoVibe exchanges that code server-side for the
   user's own access/refresh token.
3. **Tokens are per-user, per-workspace**, never global. They belong behind the multi-tenant
   principal-scoped vault binding in `ADR-028-Multi-Tenant-Principal-Scoped-Vault-Binding.md`
   — a connected PM account is exactly the kind of authorization-scoped credential that ADR
   already models (`principal_id` + `project_id`/`workspace_id` dimensions), not a new storage
   mechanism.
4. **The redirect URI can be loopback** (`http://127.0.0.1:4310/...`). The redirect is a
   browser navigation the user's own browser performs, not a server-to-server call — the same
   pattern `gh`/`docker` CLI auth already uses. This is compatible with ADR-029 §4's
   loopback-only sidecar constraint without opening any new inbound surface.

## 3. Notion

| Requirement | Detail |
|---|---|
| App registration | `client_id`, `client_secret`, `redirect_uri` registered as a **public integration** in the Notion developer portal |
| Authorize URL | `https://api.notion.com/v1/oauth/authorize` — query params `client_id`, `redirect_uri`, `response_type=code`, `owner=user`, optional `state` |
| Token exchange | `POST https://api.notion.com/v1/oauth/token`, HTTP Basic auth (`client_id:client_secret`), body `grant_type=authorization_code` + `code` + `redirect_uri` |
| Token response | `access_token`, `refresh_token`, `workspace_id`, `bot_id`, owner metadata |
| Token lifecycle | Refreshable via the same endpoint with `grant_type=refresh_token` |
| Scope model | **No granular scope list.** The user picks which pages/databases to share with the integration during the consent screen itself; there is nothing else to request |
| Create a card | `POST /v1/pages` — `parent.database_id` + `properties` mapped to the target database's schema (title, rich_text, select/status, date, relation, checkbox, number, people, etc.) |
| Response | Page `id` and `url`, usable as the projection's backlink target |
| Rate limit | ~3 requests/second per token (with burst allowance); 2,700 calls / 15 minutes per token; a separate per-workspace ceiling shared across all connections, scaled to the workspace's plan |

Reference: [Notion Authorization](https://developers.notion.com/docs/authorization),
[Create a page](https://developers.notion.com/reference/post-page),
[Request limits](https://developers.notion.com/reference/request-limits).

## 4. Jira (Atlassian Cloud, OAuth 2.0 3LO)

| Requirement | Detail |
|---|---|
| App registration | `client_id`, `client_secret`, callback URL registered in the Atlassian Developer Console |
| Authorize URL | `https://auth.atlassian.com/authorize` — query params `audience=api.atlassian.com`, `client_id`, `scope`, `redirect_uri`, `state`, `response_type=code`, `prompt=consent` |
| Token exchange | `POST https://auth.atlassian.com/oauth/token` — JSON body `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri` |
| Refresh token | Only issued if `offline_access` is in the requested scope. Rotating: each use issues a new refresh token valid 90 days — the stored token must be replaced on every refresh, not reused |
| Resolving the target site | `GET https://api.atlassian.com/oauth/token/accessible-resources` (Bearer token) returns every Jira site the user authorized, each with an `id` (cloudid) and its own granted `scopes`. API calls are then `https://api.atlassian.com/ex/jira/{cloudid}/rest/api/2/{endpoint}` — **a connection is not complete until a site is chosen from this list**, since one Atlassian account can have several sites |
| Scope model | Two incompatible systems: **classic scopes** (`read:jira-work`, `write:jira-work`, `read:jira-user`) and **granular scopes** (`read:issue:jira`, `write:issue:jira`, `write:comment:jira`, etc.). Jira Platform/Service Management support classic scopes; plain Jira Software requires granular scopes for some operations |
| Rate limiting | Three independent systems apply at once: an hourly points-based quota (cost varies by call complexity), a per-second burst limit per endpoint, and a per-issue write-frequency limit |

Reference: [OAuth 2.0 (3LO) apps](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/),
[Jira scopes for OAuth 2.0](https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/),
[Rate limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/).

### 4.1 Known issue to design around (found 2026-08-17, re-verify before build)

Community reports from April 2026 describe granular-scoped Cloud tokens authenticating
correctly for `GET`/`PUT` but returning `401` on `POST` — meaning issue *edit* works but issue
*create* and *comment* fail under granular scopes. GLS-005's primary operation is creating a
new entry (`POST`), so **the adapter should request the classic scope `write:jira-work`**
rather than granular `write:issue:jira`/`write:comment:jira`, until this is confirmed fixed
upstream. Re-check the Atlassian changelog before locking the scope list into the Task
Container.

## 5. What this means for GLS-005's design (not yet decided — flagged for the Task Container)

- **Credential storage**: connected accounts are ADR-028-scoped vault entries
  (`principal_id` + `project_id`/`workspace_id`), not a new secret store.
- **OAuth callback route**: one new sidecar HTTP route per platform
  (`/connectors/notion/callback`, `/connectors/jira/callback`), loopback-bound like everything
  else in ADR-029 — no new inbound network surface.
- **Jira scope choice**: request classic scopes (`write:jira-work offline_access`) for the
  first implementation given §4.1; revisit if Atlassian's granular-scope POST bug is
  confirmed fixed.
- **Site selection UI**: Jira needs an explicit "which site?" step after connect (via
  `accessible-resources`) that Notion does not need — the connector UI cannot be identical
  for both platforms even though the OAuth shape is.
- **Refresh handling**: Jira's rotating refresh tokens must be persisted on every refresh, not
  just at initial connect, or the connection silently breaks after ~90 days.
- **Rate-limit-aware sync**: outbound projection (§ADR-029 Decision 6, "outbound-first") should
  batch/throttle against Notion's per-token ceiling and Jira's points quota rather than push
  one request per changed field.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.0+draft | 2026-08-17 | Initial research capture for GLS-005: shared connector model, per-platform OAuth/scope/rate-limit requirements, and the Jira granular-scope POST issue found during research. |
