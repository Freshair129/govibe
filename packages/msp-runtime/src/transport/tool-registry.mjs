// A small, transport-agnostic tool dispatch table.
//
// The registry is generic; `src/server.mjs` (the composition root) owns the
// concrete `msp_*` and `msp_memory_*` registrations, including the diagnostic
// `msp_ping` and bounded `msp_health` queries.

export class ToolRegistry {
  #handlers = new Map();

  /**
   * Register a tool handler.
   * @param {string} name
   * @param {(args: Record<string, unknown>) => unknown | Promise<unknown>} handler
   */
  register(name, handler) {
    if (typeof name !== "string" || !name) {
      throw new TypeError("ToolRegistry.register requires a non-empty tool name.");
    }
    if (typeof handler !== "function") {
      throw new TypeError(`ToolRegistry.register("${name}") requires a handler function.`);
    }
    this.#handlers.set(name, handler);
    return this;
  }

  has(name) {
    return this.#handlers.has(name);
  }

  /**
   * Dispatch a tool call by name. Resolves to the MCP tool-call result
   * envelope `{content, structuredContent}` on success. Throws on an unknown
   * tool name or on a handler failure -- the transport layer is responsible
   * for catching that throw and wrapping it as `{isError:true, content:[...]}`.
   */
  async dispatch(name, args) {
    const handler = this.#handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await handler(args ?? {});
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
}
