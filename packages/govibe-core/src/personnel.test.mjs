// SPEC-Workspace-System §3.3 personnel identity conformance (TASK-PRD-014, AC-07).

import { describe, expect, it } from "vitest";

import { createPersonnelRegistry, createWorkspaceVaultBindings, EMPLOYMENT_TYPES, normalizeAgentId, validatePersonnelId } from "./index.mjs";

function fixedClock() {
  let tick = 0;
  return () => `2026-08-09T00:00:0${tick++}.000Z`;
}

describe("personnel identity — §3.3 rule 1: single active identity", () => {
  it("registers a permanent employee with the employee_ namespace and discriminator", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    const record = registry.registerPersonnel({ personRef: "hr:alice", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_alice-01", actor: "Boss" });
    expect(record).toMatchObject({ employment_type: "permanent", id: "employee_alice-01", status: "active", supersedes: null });
  });

  it("registers contract staff with the staff_ namespace and discriminator", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    const record = registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    expect(record).toMatchObject({ employment_type: "contract", id: "staff_bob-2026", status: "active" });
  });

  it("rejects an ID from the wrong namespace for the employment type", () => {
    expect(() => validatePersonnelId(EMPLOYMENT_TYPES.PERMANENT, "staff_alice-01")).toThrow(/does not match the permanent namespace/);
    expect(() => validatePersonnelId(EMPLOYMENT_TYPES.CONTRACT, "employee_bob-01")).toThrow(/does not match the contract namespace/);
    expect(() => validatePersonnelId("freelance", "staff_bob-01")).toThrow(/Unknown employment_type/);
    expect(() => validatePersonnelId(EMPLOYMENT_TYPES.PERMANENT, "employee_UPPER")).toThrow(/does not match/);
  });

  it("rejects a second active identity for the same person, in either namespace", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:alice", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_alice-01", actor: "Boss" });
    expect(() => registry.registerPersonnel({ personRef: "hr:alice", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_alice-02", actor: "Boss" })).toThrow(/already holds an active identity/);
    expect(() => registry.registerPersonnel({ personRef: "hr:alice", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_alice-01", actor: "Boss" })).toThrow(/already holds an active identity/);
  });

  it("never reuses an ID value for a different person, even after retirement", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_bob-01", actor: "Boss" });
    // staff_bob-2026 is retired now — still not reusable for someone else.
    expect(() => registry.registerPersonnel({ personRef: "hr:carol", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" })).toThrow(/already issued/);
  });
});

describe("personnel identity — §3.3 rule 2 / AC-07: conversion via supersedes", () => {
  it("converts contract to permanent: new ID issued, old retired with a supersedes link", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    const { retired, active } = registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_bob-01", actor: "Boss" });

    expect(retired).toMatchObject({ id: "staff_bob-2026", status: "retired", superseded_by: "employee_bob-01" });
    expect(active).toMatchObject({ id: "employee_bob-01", status: "active", employment_type: "permanent", supersedes: "staff_bob-2026" });

    // AC-07: never both active at once.
    expect(registry.getActiveIdentity("hr:bob").id).toBe("employee_bob-01");
    expect(registry.getIdentity("staff_bob-2026").status).toBe("retired");
  });

  it("preserves the audit trail under the retired ID without rewriting it", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    const beforeConversion = registry.getAuditTrail("staff_bob-2026");
    registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_bob-01", actor: "Boss" });
    const afterConversion = registry.getAuditTrail("staff_bob-2026");

    // Existing entries are untouched; conversion only appends.
    expect(afterConversion.slice(0, beforeConversion.length)).toEqual(beforeConversion);
    expect(afterConversion.length).toBeGreaterThan(beforeConversion.length);
    expect(afterConversion.some((entry) => entry.action === "superseded" && entry.superseded_by === "employee_bob-01")).toBe(true);
  });

  it("rejects a same-type conversion — IDs are immutable once issued", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    expect(() => registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2027", actor: "Boss" })).toThrow(/IDs are immutable/);
  });

  it("supports converting back (permanent to contract) with a fresh ID and preserved chain", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_bob-01", actor: "Boss" });
    const { active } = registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2027", actor: "Boss" });
    expect(active.supersedes).toBe("employee_bob-01");
    expect(registry.getIdentity("employee_bob-01")).toMatchObject({ status: "retired", superseded_by: "staff_bob-2027" });
    expect(registry.getIdentity("staff_bob-2026")).toMatchObject({ status: "retired", superseded_by: "employee_bob-01" });
  });
});

describe("personnel identity — §3.3 rule 3: actor attribution", () => {
  it("resolves the active ID for actor attribution, following conversions", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    expect(registry.resolveActor("hr:bob")).toBe("staff_bob-2026");
    registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_bob-01", actor: "Boss" });
    expect(registry.resolveActor("hr:bob")).toBe("employee_bob-01");
    expect(() => registry.resolveActor("hr:nobody")).toThrow(/no active identity/);
  });

  it("requires an actor on every mutating operation", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    expect(() => registry.registerPersonnel({ personRef: "hr:alice", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_alice-01" })).toThrow(/require an actor/);
  });
});

describe("personnel identity — §3.3 rule 4: separation from agent_id and vault bindings", () => {
  it("rejects personnel IDs as agent identifiers", () => {
    expect(() => normalizeAgentId("employee_alice-01")).toThrow(/cannot be used as agent identifiers/);
    expect(() => normalizeAgentId("staff_bob-2026")).toThrow(/cannot be used as agent identifiers/);
    expect(normalizeAgentId("default-agent")).toBe("default-agent");
  });

  it("keeps personnel IDs out of vault binding records", () => {
    expect(() => createWorkspaceVaultBindings({ projectName: "demo", workspacePath: "/tmp/demo", agentId: "employee_alice-01" })).toThrow(/cannot be used as agent identifiers/);
    const bindings = createWorkspaceVaultBindings({ projectName: "demo", workspacePath: "/tmp/demo", agentId: "agent-alice" });
    expect(JSON.stringify(bindings)).not.toMatch(/employee_|staff_/);
  });
});

describe("personnel identity — §3.3 rule 5 and persistence round-trip", () => {
  it("exposes employment_type as the discriminator consumers must read", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    const record = registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    expect(record.employment_type).toBe("contract");
    expect(record.schema).toBe("govibe-personnel-record/v1");
  });

  it("round-trips through exportRecords and keeps enforcing identity rules", () => {
    const registry = createPersonnelRegistry({ now: fixedClock() });
    registry.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" });
    registry.convertEmployment({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.PERMANENT, id: "employee_bob-01", actor: "Boss" });

    const snapshot = registry.exportRecords();
    expect(snapshot.schema).toBe("govibe-personnel-registry/v1");

    const restored = createPersonnelRegistry({ records: snapshot.records, auditLog: snapshot.auditLog, now: fixedClock() });
    expect(restored.resolveActor("hr:bob")).toBe("employee_bob-01");
    expect(restored.getAuditTrail("staff_bob-2026")).toEqual(registry.getAuditTrail("staff_bob-2026"));
    expect(() => restored.registerPersonnel({ personRef: "hr:carol", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2026", actor: "Boss" })).toThrow(/already issued/);
    expect(() => restored.registerPersonnel({ personRef: "hr:bob", employmentType: EMPLOYMENT_TYPES.CONTRACT, id: "staff_bob-2027", actor: "Boss" })).toThrow(/already holds an active identity/);
  });
});
