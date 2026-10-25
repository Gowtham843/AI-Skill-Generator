import { skillBody, skillToMarkdown, type CanonicalSkill } from "@/lib/skill/schema";
import { toKebabCase } from "@/lib/validation/validators";

export type Platform = "cursor" | "claude-code" | "opencode" | "generic";
export const PLATFORMS: Platform[] = ["cursor", "claude-code", "opencode", "generic"];

type SkillRecord = {
  name: string;
  version: string;
  description: string;
  content: string | null;
  tags: string | null;
  category: string | null;
  technology: string | null;
};

// Builds the export shape from a saved Skill row.
export function canonicalFromRecord(skill: SkillRecord): CanonicalSkill {
  const c = JSON.parse(skill.content ?? "{}");
  return {
    name: skill.name,
    version: skill.version,
    description: skill.description,
    instructions: c.instructions ?? "",
    rules: c.rules ?? [],
    examples: c.examples ?? [],
    antiPatterns: c.antiPatterns ?? [],
    context: c.context ?? "",
    references: c.references ?? [],
    tests: [],
    tags: skill.tags?.split(",").filter(Boolean) ?? [],
    metadata: c.metadata ?? {},
    compatibility: [],
    category: skill.category ?? undefined,
    technology: skill.technology ?? undefined,
  };
}

function withFrontmatter(fields: Record<string, unknown>, body: string): string {
  const fm = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");
  return `---\n${fm}\n---\n\n${body}`;
}

// Files to add, keyed by their path from the project root.
export function generateForPlatform(skill: CanonicalSkill, platform: Platform): Record<string, string> {
  const name = toKebabCase(skill.name); // safe for file paths
  const body = skillBody(skill);
  switch (platform) {
    case "cursor":
      return { [`.cursor/rules/${name}.mdc`]: withFrontmatter({ description: skill.description, alwaysApply: false }, `# ${name}\n\n${body}`) };
    case "claude-code":
      return { [`.claude/skills/${name}/SKILL.md`]: withFrontmatter({ name, description: skill.description }, body) };
    case "opencode":
      return { [`.opencode/skills/${name}/SKILL.md`]: withFrontmatter({ name, description: skill.description }, body) };
    default:
      return { [`${name}/SKILL.md`]: skillToMarkdown({ ...skill, name }) };
  }
}

// Shell script to run from the project root. Paths are quoted and the
// heredoc is quoted, so skill text is written as-is and never executed.
export function installScript(skill: CanonicalSkill, platform: Platform): string {
  let script = `# Install ${toKebabCase(skill.name)} for ${platform}. Run from your project root.\n`;
  for (const [path, content] of Object.entries(generateForPlatform(skill, platform))) {
    let end = "SKILL_EOF";
    while (content.includes(end)) end += "_X";
    const dir = path.slice(0, path.lastIndexOf("/"));
    script += `mkdir -p '${dir}'\ncat > '${path}' << '${end}'\n${content}\n${end}\n`;
  }
  return script;
}
