import { revalidateTag } from "next/cache";

import { calendarMonthTagForDate } from "./calendar-tags";

/** Call after mutations that affect calendar aggregates for a learning session. */
export function revalidateCalendarForSessionStartedAt(startedAt: Date): void {
  revalidateTag(calendarMonthTagForDate(startedAt));
}
