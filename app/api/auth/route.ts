import { NextResponse } from "next/server";

async function hashToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + "__orient-print-salt__");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const sitePassword = process.env.SITE_PASSWORD;

    if (!sitePassword) {
      return NextResponse.json({ error: "No password configured" }, { status: 500 });
    }

    if (password !== sitePassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const token = await hashToken(sitePassword);
    const response = NextResponse.json({ ok: true });

    response.cookies.set("orient-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
