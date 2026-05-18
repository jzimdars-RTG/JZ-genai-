import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/**
 * Reads approval from stdin.
 *
 * @returns {Promise<boolean>}
 */
async function promptApproval() {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question("Approve final action? (y/N): ");
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

/**
 * Creates the human-in-the-loop approval node.
 *
 * @param {{ mode: "auto"|"stdin" }} options
 */
export function createHumanApprovalNode({ mode }) {
  return async () => {
    const approved = mode === "auto" ? true : await promptApproval();

    return {
      humanApproved: approved,
      done: approved
    };
  };
}
