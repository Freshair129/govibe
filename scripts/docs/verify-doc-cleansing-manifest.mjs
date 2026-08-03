import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestRoot = resolve(repoRoot, "docs/change-requests/manifests");
const batchIds = ["B01", "B02", "B03", "B04", "B05"];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readJson(name) {
  return JSON.parse(readFileSync(resolve(manifestRoot, name), "utf8"));
}

function utf8PathCompare(left, right) {
  return Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8"));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--external-root");
  if (index === -1) return { externalRoot: null };
  if (!args[index + 1] || args.length !== 2) {
    throw new Error("Usage: node scripts/docs/verify-doc-cleansing-manifest.mjs [--external-root <path>]");
  }
  return { externalRoot: resolve(args[index + 1]) };
}

function canonicalProjection(inventory) {
  const trackedRecords = [...inventory.included, ...inventory.tracked_exclusions]
    .sort(utf8PathCompare)
    .map((record) => ({
      path: record.path,
      git_object_id: record.git_object_id,
      bytes: record.bytes,
      sha256: record.sha256,
      disposition: record.disposition,
      batch: record.batch ?? null,
    }));

  return {
    baseline_commit: inventory.baseline_commit,
    tracked_records: trackedRecords,
  };
}

function readGitBlobs(records) {
  const input = `${records.map((record) => record.git_object_id).join("\n")}\n`;
  const result = spawnSync("git", ["cat-file", "--batch"], {
    cwd: repoRoot,
    input,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git cat-file --batch failed: ${result.stderr.toString("utf8")}`);
  }

  const blobs = new Map();
  let offset = 0;
  for (const record of records) {
    const headerEnd = result.stdout.indexOf(10, offset);
    if (headerEnd === -1) throw new Error(`Missing git cat-file header for ${record.path}`);
    const [objectId, type, sizeText] = result.stdout
      .subarray(offset, headerEnd)
      .toString("utf8")
      .split(" ");
    const size = Number(sizeText);
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (type !== "blob" || !Number.isSafeInteger(size) || contentEnd >= result.stdout.length) {
      throw new Error(`Invalid git cat-file response for ${record.path}`);
    }
    const bytes = result.stdout.subarray(contentStart, contentEnd);
    blobs.set(record.path, { objectId, bytes: bytes.length, sha256: sha256(bytes) });
    offset = contentEnd + 1;
  }
  return blobs;
}

function gitTree(baseline) {
  const output = execFileSync("git", ["ls-tree", "-r", baseline, "--", "docs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return new Map(
    output.trim().split(/\r?\n/).filter(Boolean).map((line) => {
      const match = line.match(/^\d+\s+blob\s+([0-9a-f]+)\t(.+)$/);
      if (!match) throw new Error(`Unexpected git ls-tree row: ${line}`);
      return [match[2], match[1]];
    }),
  );
}

function verifyExternal(records, externalRoot, errors) {
  for (const record of records) {
    if (
      record.hash_source !== "filesystem_bytes" ||
      record.hash_algorithm !== "sha256" ||
      record.normalization !== "none" ||
      record.disposition !== "preserved_unmodified"
    ) {
      errors.push(`invalid external marker: ${record.path}`);
    }
  }
  if (!externalRoot) return { status: "skipped_no_external_root", verified: 0 };

  let verified = 0;
  for (const record of records) {
    const absolute = resolve(externalRoot, record.path);
    const outside = relative(externalRoot, absolute).startsWith(`..${sep}`) || isAbsolute(relative(externalRoot, absolute));
    if (outside) {
      errors.push(`external path escapes root: ${record.path}`);
      continue;
    }
    try {
      const bytes = readFileSync(absolute);
      if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) {
        errors.push(`external filesystem mismatch: ${record.path}`);
      } else {
        verified += 1;
      }
    } catch (error) {
      errors.push(`external file unavailable: ${record.path}: ${error.message}`);
    }
  }
  return { status: errors.some((error) => error.startsWith("external ")) ? "failed" : "verified", verified };
}

function main() {
  const { externalRoot } = parseArgs();
  const inventory = readJson("DOC-CLEANSING-INVENTORY-v1.json");
  const batches = batchIds.map((id) => readJson(`DOC-CLEANSING-${id}-v1.json`));
  const errors = [];
  const tracked = [...inventory.included, ...inventory.tracked_exclusions].sort(utf8PathCompare);
  const tree = gitTree(inventory.baseline_commit);
  const blobs = readGitBlobs(tracked);

  if (tree.size !== 201 || tracked.length !== 201) errors.push(`tracked count mismatch: tree=${tree.size}, manifest=${tracked.length}`);
  for (const record of tracked) {
    const blob = blobs.get(record.path);
    if (tree.get(record.path) !== record.git_object_id) errors.push(`baseline object mismatch: ${record.path}`);
    if (!blob || blob.objectId !== record.git_object_id || blob.bytes !== record.bytes || blob.sha256 !== record.sha256) {
      errors.push(`git blob evidence mismatch: ${record.path}`);
    }
    if (record.hash_source !== "git_blob" || record.hash_algorithm !== "sha256" || record.normalization !== "none") {
      errors.push(`invalid tracked hash marker: ${record.path}`);
    }
  }

  const projectionBytes = Buffer.from(JSON.stringify(canonicalProjection(inventory)), "utf8");
  const sourceManifestHash = sha256(projectionBytes);
  if (inventory.source_manifest_hash !== sourceManifestHash) errors.push("inventory source_manifest_hash mismatch");
  if (inventory.hash_contract.canonical_projection_bytes !== projectionBytes.length) errors.push("canonical projection byte count mismatch");

  const inventoryByPath = new Map(inventory.included.map((record) => [record.path, record]));
  const batchPaths = [];
  for (const batch of batches) {
    if (batch.source_manifest_hash !== sourceManifestHash) errors.push(`${batch.batch_id} source_manifest_hash mismatch`);
    if (batch.file_count !== batch.files.length || batch.files.length > 50) errors.push(`${batch.batch_id} count invalid`);
    for (const record of batch.files) {
      batchPaths.push(record.path);
      const source = inventoryByPath.get(record.path);
      if (!source || JSON.stringify(source) !== JSON.stringify(record) || source.batch !== batch.batch_id) {
        errors.push(`${batch.batch_id} record mismatch: ${record.path}`);
      }
    }
  }
  const uniqueBatchPaths = new Set(batchPaths);
  if (batchPaths.length !== 195 || uniqueBatchPaths.size !== 195 || inventoryByPath.size !== 195) {
    errors.push(`batch accounting mismatch: copies=${batchPaths.length}, unique=${uniqueBatchPaths.size}, inventory=${inventoryByPath.size}`);
  }

  const external = verifyExternal(inventory.external_untracked_exclusions, externalRoot, errors);
  const proof = {
    status: errors.length === 0 ? "pass" : "fail",
    baseline_commit: inventory.baseline_commit,
    tracked_git_blobs_verified: tracked.length,
    processable_unique: uniqueBatchPaths.size,
    tracked_exclusions: inventory.tracked_exclusions.length,
    source_manifest_hash: sourceManifestHash,
    canonical_projection_bytes: projectionBytes.length,
    serialization: "UTF-8 JSON.stringify; explicit key order; UTF-8 bytewise path order; no trailing newline",
    external,
    errors,
  };
  console.log(JSON.stringify(proof, null, 2));
  if (errors.length > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ status: "fail", errors: [error.message] }, null, 2));
  process.exitCode = 1;
}
