import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toKebabCase, validateSkill } from "@/lib/validation/validators";

const VISIBILITY = ["PRIVATE", "ORGANIZATION", "PUBLIC"];
const STATUS = ["DRAFT", "REQUIRES_REVIEW", "PUBLISHED", "ARCHIVED"];
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const skill = await prisma.skill.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        { visibility: "PUBLIC" },
        // Only match org skills when the user is in an org (null would match everyone's).
        ...(user.organizationId ? [{ organizationId: user.organizationId, visibility: "ORGANIZATION" as const }] : []),
      ],
    },
    include: {
      owner: { select: { name: true } },
      versions: { orderBy: { createdAt: "desc" } },
      tests: { orderBy: { createdAt: "desc" } },
      installations: { orderBy: { installedAt: "desc" } },
    },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  return NextResponse.json(skill);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const body = await request.json();
  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Only these fields can be changed. ownerId, slug etc. are never taken from the request.
  const name = str(body.name) ? toKebabCase(body.name) : skill.name;
  const description = str(body.description) ?? skill.description;
  const tags = Array.isArray(body.tags) ? body.tags.join(",") : str(body.tags);
  let contentJson: Record<string, unknown> | undefined;
  try {
    contentJson = typeof body.content === "string" ? JSON.parse(body.content) : body.content ?? undefined;
  } catch {
    return NextResponse.json({ errors: ["content is not valid JSON"] }, { status: 400 });
  }

  if (contentJson) {
    const validation = validateSkill({ ...contentJson, name, description });
    if (!validation.valid) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
  }

  const updated = await prisma.skill.update({
    where: { id },
    data: {
      name,
      description,
      tags,
      category: str(body.category),
      technology: str(body.technology),
      visibility: VISIBILITY.includes(body.visibility) ? body.visibility : undefined,
      status: STATUS.includes(body.status) ? body.status : undefined,
      content: contentJson ? JSON.stringify(contentJson) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
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

  await prisma.skill.delete({ where: { id: id } });
  return NextResponse.json({ deleted: true });
}
