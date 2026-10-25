import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { getServerSession } from "next-auth";

export async function GET() {
  const session = await getServerSession(authConfig);
  return NextResponse.json({ user: session?.user ?? null });
}
