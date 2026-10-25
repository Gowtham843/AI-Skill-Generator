import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bumpMinor } from "@/lib/skill/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  const skill = await prisma.skill.findFirst({ where: { id, ownerId: user.id } });
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const versions = await prisma.skillVersion.findMany({
    where: { skillId: id },
    orderBy: { version: "desc" },
  });

  return NextResponse.json(versions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const body = await request.json();
  const version = typeof body.version === "string" ? body.version : bumpMinor(skill.version);

  const newVersion = await prisma.skillVersion.create({
    data: {
      skillId: id,
      version,
      content: skill.content ?? "{}",
      metadata: JSON.stringify(body.metadata ?? {}),
      status: "PUBLISHED",
      createdBy: user.id,
    },
  });

  await prisma.skill.update({
    where: { id: id },
    data: { version, updatedAt: new Date() },
  });

  return NextResponse.json(newVersion, { status: 201 });
}
