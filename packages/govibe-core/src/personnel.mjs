// Personnel identity model per docs/specs/SPEC-Workspace-System.md §3.3 (TASK-PRD-014).
// Humans are one `personnel` entity with an `employment_type` discriminator; the type decides
// the ID namespace (`employee_*` permanent, `staff_*` contract). Consumers MUST read
// `employment_type`, never parse the ID prefix.

export const EMPLOYMENT_TYPES = Object.freeze({ PERMANENT: "permanent", CONTRACT: "contract" });

const ID_PATTERNS = Object.freeze({
  [EMPLOYMENT_TYPES.PERMANENT]: /^employee_[a-z0-9][a-z0-9-]{3,31}$/,
  [EMPLOYMENT_TYPES.CONTRACT]: /^staff_[a-z0-9][a-z0-9-]{3,31}$/,
});

export const PERSONNEL_ID_NAMESPACE = /^(employee|staff)_/;

export function validatePersonnelId(employmentType, id) {
  const pattern = ID_PATTERNS[employmentType];
  if (!pattern) throw new Error(`Unknown employment_type: ${employmentType}`);
  if (!pattern.test(String(id ?? ""))) {
    throw new Error(`Personnel ID does not match the ${employmentType} namespace: ${id}`);
  }
  return id;
}

function requireActor(actor) {
  const value = String(actor ?? "").trim();
  if (!value) throw new Error("Personnel operations require an actor.");
  return value;
}

// Registry over plain records so callers own persistence. `records` accepts a prior
// exportRecords() snapshot; every mutation appends audit entries and never rewrites history.
export function createPersonnelRegistry({ records = [], auditLog = [], now = () => new Date().toISOString() } = {}) {
  const byId = new Map();
  const audit = [];

  function adopt(record) {
    if (byId.has(record.id)) throw new Error(`Personnel ID is already issued: ${record.id}`);
    byId.set(record.id, { ...record });
  }
  for (const record of records) adopt(record);
  for (const entry of auditLog) audit.push({ ...entry });

  function activeRecordFor(personRef) {
    for (const record of byId.values()) {
      if (record.person_ref === personRef && record.status === "active") return record;
    }
    return null;
  }

  function appendAudit(action, record, actor, details = {}) {
    audit.push({ at: now(), actor, action, person_ref: record.person_ref, id: record.id, employment_type: record.employment_type, ...details });
  }

  function registerPersonnel({ personRef, employmentType, id, actor }) {
    const safeActor = requireActor(actor);
    const ref = String(personRef ?? "").trim();
    if (!ref) throw new Error("Personnel registration requires a person_ref.");
    validatePersonnelId(employmentType, id);
    // Spec §3.3 rule 1: a person holds exactly one active ID at a time, and an ID value is
    // never reused — not even after retirement, not even for the same person.
    const active = activeRecordFor(ref);
    if (active) throw new Error(`Person ${ref} already holds an active identity: ${active.id}`);
    if (byId.has(id)) throw new Error(`Personnel ID is already issued: ${id}`);
    const record = { schema: "govibe-personnel-record/v1", person_ref: ref, employment_type: employmentType, id, status: "active", issued_at: now(), supersedes: null, superseded_by: null };
    byId.set(id, record);
    appendAudit("registered", record, safeActor);
    return { ...record };
  }

  function convertEmployment({ personRef, employmentType, id, actor }) {
    const safeActor = requireActor(actor);
    const current = activeRecordFor(String(personRef ?? "").trim());
    if (!current) throw new Error(`Person ${personRef} has no active identity to convert.`);
    if (current.employment_type === employmentType) {
      throw new Error(`Conversion must change employment_type; ${personRef} is already ${employmentType}. IDs are immutable once issued.`);
    }
    validatePersonnelId(employmentType, id);
    if (byId.has(id)) throw new Error(`Personnel ID is already issued: ${id}`);

    // Spec §3.3 rule 2: retire the old ID with a recorded supersedes link; the audit trail
    // under the retired ID is preserved, never rewritten.
    current.status = "retired";
    current.superseded_by = id;
    current.retired_at = now();
    const record = { schema: "govibe-personnel-record/v1", person_ref: current.person_ref, employment_type: employmentType, id, status: "active", issued_at: now(), supersedes: current.id, superseded_by: null };
    byId.set(id, record);
    appendAudit("superseded", current, safeActor, { superseded_by: id });
    appendAudit("registered", record, safeActor, { supersedes: current.id });
    return { retired: { ...current }, active: { ...record } };
  }

  function getIdentity(id) {
    const record = byId.get(id);
    return record ? { ...record } : null;
  }

  function getActiveIdentity(personRef) {
    const record = activeRecordFor(personRef);
    return record ? { ...record } : null;
  }

  // Spec §3.3 rule 3: when personnel identity is available, the `actor` sent to govibe.* tools
  // MUST be the active employee_id/staff_id, not a free-form name.
  function resolveActor(personRef) {
    const record = activeRecordFor(personRef);
    if (!record) throw new Error(`Person ${personRef} has no active identity for actor attribution.`);
    return record.id;
  }

  function getAuditTrail(id) {
    return audit.filter((entry) => entry.id === id || entry.superseded_by === id || entry.supersedes === id).map((entry) => ({ ...entry }));
  }

  function exportRecords() {
    return {
      schema: "govibe-personnel-registry/v1",
      records: [...byId.values()].map((record) => ({ ...record })),
      auditLog: audit.map((entry) => ({ ...entry })),
    };
  }

  return { registerPersonnel, convertEmployment, getIdentity, getActiveIdentity, resolveActor, getAuditTrail, exportRecords };
}
