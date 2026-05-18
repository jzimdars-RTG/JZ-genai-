import { describe, expect, test } from "@jest/globals";
import { createHumanApprovalNode } from "../../../src/agent/nodes/humanApproval.js";

describe("human approval node", () => {
  test("auto mode approves by default", async () => {
    const node = createHumanApprovalNode({ mode: "auto" });
    const result = await node({});

    expect(result.humanApproved).toBe(true);
    expect(result.done).toBe(true);
  });
});
