import "dotenv/config";

import { anchorItemMean, decayStaleItems } from "../src/lib/elo";

async function main() {
  await decayStaleItems();
  await anchorItemMean();
  console.log("✅ ELO maintenance complete");
}

main().catch(console.error);
