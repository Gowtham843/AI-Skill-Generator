import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generatedSkillSchema, toKebabCase } from "@/lib/validation/validators";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const skills = await prisma.skill.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(skills);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Saves a reviewed Skill (from either generation mode).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = generatedSkillSchema.safeParse(body?.skill);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Invalid skill. ${message}` }, { status: 400 });
    }
    const { name, description, version, tags, ...content } = parsed.data;
    const user = await getCurrentUser();

    // Slug must be unique; add a short suffix when the name is taken.
    const baseSlug = toKebabCase(name);
    const taken = await prisma.skill.findUnique({ where: { slug: baseSlug } });
    const slug = taken ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const skill = await prisma.skill.create({
      data: {
        name: toKebabCase(name),
        slug,
        description,
        version,
        content: JSON.stringify({ ...content, references: [], tests: [] }),
        tags: tags.join(","),
        category: typeof body.category === "string" ? body.category : null,
        technology: typeof body.technology === "string" ? body.technology : null,
        status: "REQUIRES_REVIEW",
        ownerId: user.id,
      },
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error("Error saving skill:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to save skill" }, { status: 500 });
  }
}
