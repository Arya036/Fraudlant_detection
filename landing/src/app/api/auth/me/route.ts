import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "sentinel-ai-dev-secret-change-in-prod";

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const tokenMatch = cookie.match(/sentinel_token=([^;]+)/);
    if (!tokenMatch) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = jwt.verify(tokenMatch[1], JWT_SECRET) as { sub: string };
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
