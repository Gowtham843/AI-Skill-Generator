import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseGeneratedSkill } from "@/lib/validation/validators";
import { getGeminiProvider, LLMError } from "@/lib/llm/factory";
import { bumpMinor } from "@/lib/skill/schema";

// Regenerates an existing Skill with Gemini and stores it as a new draft version.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const skill = await prisma.skill.findFirst({ where: { id, ownerId: user.id } });
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const content: string | undefined = body?.content;
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const provider = getGeminiProvider(body.keySource === "custom" ? String(body.apiKey ?? "") : undefined);
    const text = await provider.generateSkill(content, {
      name: skill.name,
      category: skill.category ?? undefined,
      technology: skill.technology ?? undefined,
    });
    let parsed;
    try {
      parsed = parseGeneratedSkill(text);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 502 });
    }

    const version = bumpMinor(skill.version);
    const { name, description, version: _v, tags, ...rest } = parsed;
    const newContent = JSON.stringify({ ...rest, references: [], tests: [] });

    const newVersion = await prisma.skillVersion.create({
      data: { skillId: id, version, content: newContent, status: "DRAFT", createdBy: user.id },
    });
    const updated = await prisma.skill.update({
      where: { id },
      data: {
        version,
        name: name || skill.name,
        description: description || skill.description,
        content: newContent,
        tags: tags.join(","),
        status: "REQUIRES_REVIEW",
      },
    });

    return NextResponse.json({ skill: updated, requiresReview: true, newVersion });
  } catch (error) {
    if (error instanceof LLMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Regeneration error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
