import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { valid: false, user: null },
        { status: 400 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ valid: false, user: null });
    }

    const result = await query<{
      id: string; email: string; name: string;
    }>(
      "SELECT id, email, name FROM admins WHERE id = $1",
      [decoded.id]
    );

    const admin = result.rows[0];

    if (!admin) {
      return NextResponse.json({ valid: false, user: null });
    }

    return NextResponse.json({
      valid: true,
      user: { id: admin.id, email: admin.email, name: admin.name },
    });
  } catch {
    return NextResponse.json(
      { valid: false, user: null },
      { status: 500 }
    );
  }
}
