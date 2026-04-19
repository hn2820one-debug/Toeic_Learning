import { NextResponse } from "next/server";

import { getQueueStats } from "@/lib/fsrs";

export async function GET() {
  const stats = await getQueueStats();
  return NextResponse.json(stats);
}
