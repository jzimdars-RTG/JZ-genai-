import { createAgent } from "../../src/index.js";

/**
 * A small knowledge base of ground-transportation facts.
 * Each document has a unique id and a short paragraph of text.
 *
 * @type {Array<{ id: string, text: string }>}
 */
const KNOWLEDGE_BASE = [
  {
    id: "kb-001",
    text: "Airport transfer rates are calculated based on distance from the pickup address to the terminal. Standard rates begin at $75 for trips under 20 miles and increase by $2.50 per additional mile."
  },
  {
    id: "kb-002",
    text: "Limousine vehicles available for charter include the Lincoln Town Car (up to 3 passengers), the Mercedes Sprinter van (up to 14 passengers), and the stretch limousine (up to 8 passengers)."
  },
  {
    id: "kb-003",
    text: "Meet-and-greet service includes a driver waiting at baggage claim with a name sign, assistance with luggage, and complimentary bottled water. This add-on costs $25 per trip."
  },
  {
    id: "kb-004",
    text: "Flight monitoring is included at no extra charge for all airport pickups. If a flight is delayed, the driver will adjust arrival time automatically using real-time flight tracking."
  },
  {
    id: "kb-005",
    text: "Cancellation policy: reservations cancelled more than 24 hours before pickup receive a full refund. Cancellations within 24 hours are charged 50% of the base fare. No-shows are billed at the full rate."
  },
  {
    id: "kb-006",
    text: "Dispatch operations run 24 hours a day, 7 days a week. Drivers are assigned automatically by the dispatch system based on proximity, vehicle type requested, and shift availability."
  },
  {
    id: "kb-007",
    text: "Corporate accounts receive a 10% discount on all bookings over $150. Accounts must be pre-approved with a valid business tax ID and billing address on file."
  },
  {
    id: "kb-008",
    text: "Gratuity is not included in the quoted fare. Industry standard gratuity is 15–20% of the base fare. Drivers may also be tipped in cash at the time of service."
  }
];

/**
 * Sample input representing a customer inquiry for a ground-transportation quote.
 */
const SAMPLE_INPUT = "I need a quote for a limousine airport pickup at DTW for 3 passengers. My flight is United 487 arriving at 6:15 PM. What are the cancellation terms?";

/**
 * Runs the RAG retrieval example.
 */
async function main() {
  console.log("=== RAG Retrieval Example ===\n");
  console.log("Input:", SAMPLE_INPUT);
  console.log("\nKnowledge base:", KNOWLEDGE_BASE.length, "documents\n");

  const agent = createAgent();

  const result = await agent.run({
    inputText: SAMPLE_INPUT,
    documents: KNOWLEDGE_BASE
  });

  console.log("--- Retrieved Context ---");
  for (const doc of result.state.retrievedContext) {
    console.log(`[${doc.id}] score=${doc.score.toFixed(4)}`);
    console.log(`  ${doc.text}\n`);
  }

  console.log("--- Final State ---");
  console.log(JSON.stringify(result.state, null, 2));

  agent.printSummary();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
