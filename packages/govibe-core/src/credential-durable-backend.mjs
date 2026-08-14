import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes as cryptoRandomBytes,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { Buffer } from "node:buffer";
import { CredentialVaultError } from "./credential-vault.mjs";

function fail(code, message, details = {}) {
  throw new CredentialVaultError(code, message, details);
}

function requireKey(key) {
  if (!(key instanceof Uint8Array) || key.length !== 32) {
    fail("CREDENTIAL_BACKEND_KEY_INVALID", "durable credential backend requires a 32-byte key");
  }
  return new Uint8Array(key);
}

function wipe(bytes) {
  if (bytes instanceof Uint8Array) bytes.fill(0);
}

function fileNameForRef(ref) {
  return `${createHash("sha256").update(String(ref)).digest("hex")}.credential.json`;
}

export function createDurableEncryptedSecretBackend({
  directory,
  key,
  randomBytes = cryptoRandomBytes,
} = {}) {
  if (typeof directory !== "string" || directory.trim() === "") {
    fail("CREDENTIAL_BACKEND_PATH_INVALID", "durable credential backend directory is required");
  }
  if (typeof randomBytes !== "function") {
    fail("CREDENTIAL_BACKEND_KEY_INVALID", "randomBytes must be a function");
  }

  const encryptionKey = requireKey(key);
  mkdirSync(directory, { recursive: true, mode: 0o700 });

  function pathFor(ref) {
    return join(directory, fileNameForRef(ref));
  }

  function encrypt(bytes) {
    const iv = new Uint8Array(randomBytes(12));
    if (iv.length !== 12) fail("CREDENTIAL_BACKEND_KEY_INVALID", "randomBytes returned an invalid IV length");
    try {
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
      const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
      const record = {
        version: 1,
        algorithm: "aes-256-gcm",
        iv: Buffer.from(iv).toString("base64"),
        ciphertext: ciphertext.toString("base64"),
        auth_tag: cipher.getAuthTag().toString("base64"),
      };
      ciphertext.fill(0);
      return JSON.stringify(record);
    } finally {
      wipe(iv);
    }
  }

  function decrypt(serialized, ref) {
    try {
      const record = JSON.parse(serialized);
      if (record?.version !== 1 || record?.algorithm !== "aes-256-gcm") throw new Error("unsupported record");
      const iv = Buffer.from(record.iv, "base64");
      const ciphertext = Buffer.from(record.ciphertext, "base64");
      const tag = Buffer.from(record.auth_tag, "base64");
      try {
        const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const result = new Uint8Array(plaintext);
        plaintext.fill(0);
        return result;
      } finally {
        iv.fill(0);
        ciphertext.fill(0);
        tag.fill(0);
      }
    } catch {
      fail("CREDENTIAL_DECRYPTION_FAILED", "credential could not be decrypted", { credential_ref: ref });
    }
  }

  function atomicWrite(path, serialized) {
    const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temp, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
    renameSync(temp, path);
  }

  return Object.freeze({
    put(ref, bytes) {
      const path = pathFor(ref);
      if (existsSync(path)) fail("CREDENTIAL_REF_CONFLICT", "credential reference already exists", { credential_ref: ref });
      atomicWrite(path, encrypt(bytes));
    },
    replace(ref, bytes) {
      const path = pathFor(ref);
      if (!existsSync(path)) fail("CREDENTIAL_NOT_FOUND", "credential reference was not found", { credential_ref: ref });
      atomicWrite(path, encrypt(bytes));
    },
    read(ref) {
      const path = pathFor(ref);
      if (!existsSync(path)) fail("CREDENTIAL_NOT_FOUND", "credential reference was not found", { credential_ref: ref });
      return decrypt(readFileSync(path, "utf8"), ref);
    },
    delete(ref) {
      rmSync(pathFor(ref), { force: true });
    },
    has(ref) {
      return existsSync(pathFor(ref));
    },
    inspect(ref) {
      const path = pathFor(ref);
      return Object.freeze({
        credential_ref_hash: fileNameForRef(ref).replace(".credential.json", ""),
        persisted: existsSync(path),
        directory,
      });
    },
  });
}
