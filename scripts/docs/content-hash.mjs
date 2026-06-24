// Atom-merkle content hash + ULID minting — implements ADR-021 (Doc Identity Model) and
// FEAT-GKS-Node-Identity FR-2 (content-address) / FR-1 (uid). A doc's content identity = sha256 of
// its sorted GKS atom keys (reusing the translator atomizer, forward-compatible with GenesisBlockDB).
// Frontmatter + the Changelog section are excluded, so version bumps / crosslink edits never count
// as drift — only substantive body changes do.

import { createHash, randomBytes } from "node:crypto";

import { atomize } from "../mcp/translator/atomizer.mjs";

export function bodyForHash(content) {
  let b = content.replace(/^﻿/, "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  b = b.replace(/\r\n/g, "\n");
  b = b.replace(/^#{1,6}[ \t]+(?:\d+\.[ \t]*)?Changelog\b[\s\S]*/im, ""); // drop the changelog section
  return b;
}

export function docContentHash(content) {
  const body = bodyForHash(content);
  const atoms = atomize(body).atoms || [];
  const basis = atoms.length
    ? atoms.map((a) => a.key).sort().join("|")
    : body.replace(/\s+/g, " ").trim();
  return "atom:" + createHash("sha256").update(basis).digest("hex").slice(0, 16);
}

// ULID (Crockford base32: 48-bit time + 80-bit randomness, 26 chars). Minted once, then frozen.
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function ulid(now = Date.now(), rnd = randomBytes(16)) {
  let ts = "";
  let t = now;
  for (let i = 0; i < 10; i += 1) { ts = B32[t % 32] + ts; t = Math.floor(t / 32); }
  let r = "";
  for (let i = 0; i < 16; i += 1) r += B32[rnd[i] % 32];
  return ts + r;
}

export function setContentHashField(content, hash) {
  if (/^content_hash:/m.test(content)) {
    return content.replace(/^content_hash:.*$/m, `content_hash: "${hash}"`);
  }
  return content.replace(/^(version:[ \t]*["']?[^"'\r\n]+["']?)[ \t]*$/m, `$1\ncontent_hash: "${hash}"`);
}

// uid is immutable: insert only if absent, never overwrite.
export function ensureUidField(content, mint = ulid) {
  if (/^uid:/m.test(content)) return content;
  return content.replace(/^(doc_id:[ \t]*["']?[^"'\r\n]+["']?)[ \t]*$/m, `$1\nuid: "${mint()}"`);
}
