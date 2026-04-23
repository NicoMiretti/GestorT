import { NextRequest, NextResponse } from "next/server";
import { searchInRepo } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") || "";
  try {
    const hits = await searchInRepo(q);
    return NextResponse.json({ q, hits });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
