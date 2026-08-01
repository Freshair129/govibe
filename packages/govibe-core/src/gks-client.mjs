export class GksUnavailableError extends Error {
  constructor(message = "Direct GKS access is disabled. Use the MSP parent boundary.") {
    super(message);
    this.name = "GksUnavailableError";
    this.code = "DIRECT_GKS_DISABLED";
  }
}

/**
 * Deprecated compatibility shim. GoVibe runtime code must use MspClient
 * knowledge promotion methods and must never open a GKS transport directly.
 */
export class GksClient {
  async upsertCodeKnowledge() {
    throw new GksUnavailableError();
  }
}

export function createUnavailableGksClient() {
  return new GksClient();
}

export function createGksClientFromEnvironment() {
  return createUnavailableGksClient();
}
