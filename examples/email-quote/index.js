import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAgent } from "../../src/index.js";

/**
 * Runs the email quote example.
 */
async function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const inputPath = path.join(dirname, "sample-email.txt");
  const inputText = fs.readFileSync(inputPath, "utf8");

  const agent = createAgent();
  const result = await agent.run({ inputText });

  console.log("Quote request candidate:");
  console.log(JSON.stringify(result.state.parseResult, null, 2));
  agent.printSummary();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
