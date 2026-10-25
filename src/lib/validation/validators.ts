import { z } from "zod";
import type { CanonicalSkill } from "@/lib/skill/schema";

export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  category: z.string().optional(),
  technology: z.string().optional(),
  tags: z.array(z.string()).max(20).default([]),
  content: z.string().min(1),
  visibility: z.enum(["PRIVATE", "ORGANIZATION", "PUBLIC"]).default("PRIVATE"),
  compatiblePlatforms: z.array(z.string()).default([]),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;

export const generateSkillInputSchema = z.object({
  content: z.string().min(10).max(50000),
  name: z.string().min(1).max(100).optional(),
  category: z.string().optional(),
  technology: z.string().optional(),
  examples: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
  context: z.string().optional(),
});

export type GenerateSkillInput = z.infer<typeof generateSkillInputSchema>;

// Shape of a generated Skill (both modes). Matches CanonicalSkill content fields.
export const generatedSkillSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().default("1.0.0"),
  description: z.string().min(1),
  instructions: z.string().min(1),
  rules: z.array(z.string()).default([]),
  examples: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().default(""),
        input: z.string().default(""),
        output: z.string().default(""),
        code: z.string().optional(),
      }),
    )
    .default([]),
  antiPatterns: z.array(z.string()).default([]),
  context: z.string().default(""),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string()).default({}),
});

export type GeneratedSkill = z.infer<typeof generatedSkillSchema>;

// JSON Schema sent to Gemini so it returns this exact shape.
export const generatedSkillJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "lowercase kebab-case" },
    version: { type: "string" },
    description: { type: "string" },
    instructions: { type: "string" },
    rules: { type: "array", items: { type: "string" } },
    examples: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          input: { type: "string" },
          output: { type: "string" },
          code: { type: "string" },
        },
        required: ["title", "description", "input", "output"],
      },
    },
    antiPatterns: { type: "array", items: { type: "string" } },
    context: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["name", "version", "description", "instructions", "rules", "examples", "antiPatterns", "context", "tags"],
} as const;

export function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "skill";
}

// Parse model text into a validated Skill. Throws a readable error if it does not match.
export function parseGeneratedSkill(text: string): GeneratedSkill {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    throw new Error("The model did not return valid JSON. Please try again.");
  }
  const result = generatedSkillSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
    throw new Error(`The model returned JSON that does not match the Skill schema (${issues}).`);
  }
  return { ...result.data, name: toKebabCase(result.data.name) };
}

export function validateSkill(skill: Partial<CanonicalSkill>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!skill.name || skill.name.trim().length === 0) {
    errors.push("Missing skill name");
  }
  if (!skill.description || skill.description.trim().length === 0) {
    errors.push("Missing skill description");
  }
  if (!skill.instructions || skill.instructions.trim().length === 0) {
    errors.push("Missing instructions");
  }
  if (skill.rules && hasDuplicateRules(skill.rules)) {
    errors.push("Duplicate rules detected");
  }
  if (skill.instructions && isOverlyBroad(skill.instructions)) {
    errors.push("Instructions appear overly broad");
  }
  if (skill.name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill.name)) {
    errors.push("Skill name must be lowercase kebab-case");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function hasDuplicateRules(rules: string[]): boolean {
  const normalized = rules.map((r) => r.trim().toLowerCase());
  const seen = new Set<string>();
  for (const r of normalized) {
    if (seen.has(r)) return true;
    seen.add(r);
  }
  return false;
}

function isOverlyBroad(instructions: string): boolean {
  const broadPhrases = [
    "always do",
    "never do",
    "always use",
    "never use",
    "in all cases",
    "for everything",
  ];
  const lower = instructions.toLowerCase();
  return broadPhrases.some((phrase) => lower.includes(phrase)) &&
    instructions.split(".").filter((s) => s.trim().length > 0).length < 3;
}
