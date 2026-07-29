import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const target = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const child = spawn(process.execPath, [path.join(root, "packages", "govibe-core", "bin", "init.mjs"), target], {
  cwd: root,
  stdio: "inherit",
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
