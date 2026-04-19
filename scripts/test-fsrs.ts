import { createEmptyCard, type Grade } from "ts-fsrs";

import { Rating, scheduler } from "../src/lib/fsrs";

function testScheduler() {
  const now = new Date();
  const ratings: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

  console.log("=== FSRS Smoke Test ===");

  for (const rating of ratings) {
    const fresh = createEmptyCard();
    const { card: next } = scheduler.next(fresh, now, rating);
    const days = (next.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    console.log(
      `Rating ${Rating[rating]}: next due in ${days.toFixed(2)} days, ` +
        `stability=${next.stability.toFixed(2)}, difficulty=${next.difficulty.toFixed(2)}`
    );
  }

  console.log("✅ Smoke test passed");
}

testScheduler();
