# GoVibe Consumer Boundary for RWANG

**Status:** `BOUNDARY DEFINED; CUTOVER PENDING`
**Owner:** GoVibe and RWANG maintainers
**Canonical RWANG source:** https://github.com/Freshair129/RWANG
**Scope:** Documentation only

## 1. Purpose

This document defines the product boundary between GoVibe and RWANG during the
repository-unification migration. It is a consumer contract for a future
implementation change; it is not evidence that GoVibe is currently integrated
with a released RWANG runtime.

## 2. Product Boundary

GoVibe remains a separate product: a visual Mission Control and MCP facade. It
owns the user-facing experience, GoVibe domain workflows, MCP presentation, and
product-specific policy translation.

RWANG is the canonical, headless execution kernel and governance/runtime
boundary. After an approved cutover, GoVibe may consume RWANG through an SDK,
service/API, or adapter contract that has actually been published and versioned.
No such integration is claimed by this document. GoVibe must not embed RWANG
source code, copy its runtime modules, or make the RWANG repository a nested
checkout.

The historical `Rwang-orchestrator` identity is not an active GoVibe dependency.
Future GoVibe work must target the canonical RWANG source and a released or
owner-confirmed compatibility surface instead.

```text
GoVibe Mission Control / MCP product
                |
                | SDK, service/API, or adapter contract
                v
Canonical RWANG runtime and governance kernel
                |
                | external project adapters
                v
Target repositories (kept outside both product repositories)
```

## 3. Non-Goals and Forbidden Coupling

- Do not import GoVibe UI, Mission Control state, MCP presentation concerns, or
  GoVibe product workflows into RWANG core.
- Do not vendor, copy, or track target repositories inside GoVibe or RWANG.
- Do not use GoVibe implementation details as an undocumented RWANG runtime
  contract.
- Do not treat local runs, screenshots, mocks, or unmerged branches as a
  production integration claim.
- Do not add a nested RWANG checkout or historical orchestrator checkout to
  GoVibe.

## 4. Expected Consumer Configuration

A future GoVibe integration implementation must make these inputs explicit and
reviewable. Exact field names may be chosen by the GoVibe runtime implementation
PR, but the meaning must remain stable:

| Input | Required meaning |
| --- | --- |
| `rwangSource` | Canonical source or service identity, pointing to `https://github.com/Freshair129/RWANG` or its approved deployment. |
| `rwangVersion` | Immutable RWANG release/tag or commit pin; floating branches are not acceptable for production integration. |
| `transport` | Selected SDK, service/API, or adapter contract and its endpoint/launcher settings. |
| `adapterSet` | Explicit RWANG adapter contracts enabled for the GoVibe deployment. |
| `policyProfile` | GoVibe-to-RWANG policy mapping, including authorization and execution limits. |
| `targetReference` | External target repository identity; it must not be a vendored path or embedded checkout. |
| `evidenceSink` | Destination and retention policy for run status, verification evidence, and audit correlation. |
| `credentials` | Deployment-managed secrets supplied through the environment or secret manager; never committed to either repository. |

The integration must fail closed when the pinned RWANG version, contract
capabilities, or policy profile cannot be verified.

## 5. Version and Release Dependency

Cutover is pending until all canonical Wave 1-4 PRs are merged into
`Freshair129/RWANG` and a compatible RWANG release is published or explicitly
confirmed by the owner. Until then, GoVibe documentation and code must not claim
current production integration.

The future GoVibe implementation PR must record:

1. The exact RWANG release/tag or immutable commit used for development and
   verification.
2. The SDK/API/adapter contract version consumed by GoVibe.
3. The minimum compatible RWANG version and any required migration notes.
4. The rollback version and the evidence required to prove that rollback is
   safe.

## 6. Future Implementation PR Checklist

Before a GoVibe cutover PR can be approved, the implementer must provide:

- A dependency diff showing only the canonical RWANG source and approved
  contract surface.
- A configuration example with no secrets, local state, nested checkout, or
  target-repository source.
- A contract probe proving that GoVibe can discover and invoke the pinned RWANG
  capabilities through the selected transport.
- A negative boundary check proving GoVibe UI/runtime concerns are not imported
  into RWANG core and target repositories are not vendored.
- A version mismatch and unavailable-service failure test.
- A run/evidence correlation check covering request identity, status, result, and
  verification evidence.
- A rollback or compatibility procedure tied to the pinned release.
- Owner confirmation that the canonical PR chain is merged and the release is
  available; this must be recorded in the implementation PR.

## 7. Verification Checklist

The implementation PR should run, at minimum:

```powershell
git diff --check
rg -n "Freshair129/RWANG|rwangVersion|targetReference|evidenceSink" .
rg -n "GoVibe|Mission Control|MCP" docs/ src/ packages/
```

The reviewer must also inspect the dependency graph and changed-file list for
nested checkouts, vendored target source, committed credentials, generated
runtime state, and unapproved RWANG imports. A successful local test is not by
itself proof of release readiness or production cutover.

## 8. Current Decision

GoVibe remains an external consumer. This document establishes the intended
boundary and the evidence required for a later implementation PR; it does not
change GoVibe behavior, RWANG behavior, release state, or repository topology.
