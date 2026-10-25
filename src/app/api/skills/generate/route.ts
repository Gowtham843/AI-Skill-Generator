import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSkillInputSchema, parseGeneratedSkill, type GeneratedSkill } from "@/lib/validation/validators";
import { convertWithoutAI } from "@/lib/skill/basic";
import { getGeminiModel, getGeminiProvider, isGeminiConfigured, LLMError } from "@/lib/llm/factory";

// Status for the Create page. Never returns the key itself.
export async function GET() {
  return NextResponse.json({ geminiConfigured: isGeminiConfigured(), model: getGeminiModel() });
}

const requestSchema = generateSkillInputSchema.extend({
  mode: z.enum(["basic", "ai"]).default("basic"),
  tags: z.array(z.string()).optional(),
  keySource: z.enum(["server", "custom"]).default("server"),
  apiKey: z.string().max(500).optional(),
});

// Generates a Skill for review. Nothing is saved here.
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Invalid input. ${message}` }, { status: 400 });
  }
  const { mode, content, name, category, technology, tags, examples, context, keySource, apiKey } = parsed.data;

  if (mode === "basic") {
    const skill = convertWithoutAI({ content, name, category, technology, tags });
    return NextResponse.json({ skill, mode });
  }

  try {
    const provider = getGeminiProvider(keySource === "custom" ? apiKey ?? "" : undefined);
    const text = await provider.generateSkill(content, { name, category, technology, examples, context });
    let skill: GeneratedSkill;
    try {
      skill = parseGeneratedSkill(text);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 502 });
    }
    if (tags?.length) skill.tags = Array.from(new Set([...skill.tags, ...tags]));
    return NextResponse.json({ skill, mode, model: provider.defaultModel });
  } catch (error) {
    if (error instanceof LLMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Skill generation failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Skill generation failed." }, { status: 500 });
  }
}
