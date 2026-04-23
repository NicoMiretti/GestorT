import { NextRequest, NextResponse } from "next/server";
import { pull, commitAndPush } from "@/lib/git";

export async function POST(req: NextRequest) {
  try {
    const { action, message, files } = await req.json();
    if (action === "pull") {
      const r = await pull();
      return NextResponse.json({ ok: true, result: r });
    }
    if (action === "push") {
      const r = await commitAndPush(message || "chore(tesis): avance manual", files || []);
      return NextResponse.json({ ok: true, result: r });
    }
    return NextResponse.json({ error: "action inválida (pull|push)" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
