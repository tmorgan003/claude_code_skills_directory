import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { refreshRuns } from "@/lib/db/schema";
import { isAuthorized } from "@/lib/auth";
import { runRefresh } from "@/lib/refresh";

export async function GET() {
  const runs = db.select().from(refreshRuns).orderBy(desc(refreshRuns.id)).limit(20).all();
  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRefresh();
  return NextResponse.json(result, { status: result.status === "failed" ? 500 : 200 });
}
