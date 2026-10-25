import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canonicalFromRecord, generateForPlatform, installScript, PLATFORMS, type Platform } from "@/lib/adapters/index";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const skill = await prisma.skill.findFirst({ where: { id, ownerId: user.id } });
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const platform = body.platform as Platform;
  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `platform must be one of: ${PLATFORMS.join(", ")}` }, { status: 400 });
  }

  const canonical = canonicalFromRecord(skill);
  return NextResponse.json({
    platform,
    files: generateForPlatform(canonical, platform),
    script: installScript(canonical, platform),
  });
}
