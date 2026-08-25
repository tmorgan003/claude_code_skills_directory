import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { repos } from "@/lib/db/schema";
import { isAuthorized } from "@/lib/auth";

const VALID_TYPES = new Set(["skill", "mcp_server", "unclassified"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json()) as { type?: string; category?: string; hidden?: boolean };
  const update: Record<string, unknown> = {};

  if (body.type !== undefined) {
    if (!VALID_TYPES.has(body.type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    update.type = body.type;
  }
  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !body.category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    update.category = body.category;
  }
  if (body.hidden !== undefined) {
    if (typeof body.hidden !== "boolean") {
      return NextResponse.json({ error: "Invalid hidden" }, { status: 400 });
    }
    update.hidden = body.hidden;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = db.update(repos).set(update).where(eq(repos.id, id)).returning().all();
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ repo: updated });
}
