import { govibeRuntime } from "./runtime-core.mjs";

function readArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source") {
      args.source = argv[index + 1];
      index += 1;
    } else if (token === "--output") {
      args.outputPath = argv[index + 1];
      index += 1;
    } else if (token === "--overwrite") {
      args.overwrite = true;
    }
  }
  return args;
}

const args = readArgs(process.argv.slice(2));
await govibeRuntime.initialize();
const result = await govibeRuntime.exportRoadmapMarkdown(args);

console.log("PASS: roadmap markdown export");
console.log(`source: ${result.source}`);
console.log(`output: ${result.outputPath}`);
console.log(`nodes: ${result.nodeCount}`);
console.log(`tasks: ${result.taskCount}`);
