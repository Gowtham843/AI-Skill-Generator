// Rule-based ("Without AI") Skill conversion. Deterministic, no LLM calls.
// It only re-arranges the user's own text; it never adds new requirements.
import { toKebabCase, type GeneratedSkill } from "@/lib/validation/validators";

export interface BasicSkillInput {
  content: string;
  name?: string;
  category?: string;
  technology?: string;
  tags?: string[];
}

type Bucket = "rules" | "examples" | "antiPatterns" | "context";

const HEADING_BUCKETS: Array<[RegExp, Bucket]> = [
  [/anti[- ]?patterns?|avoid|don'?ts?|do not|never|forbidden/i, "antiPatterns"],
  [/examples?|samples?/i, "examples"],
  [/rules?|guidelines?|conventions?|requirements?|instructions?|dos?\b/i, "rules"],
  [/context|background|overview|notes?|about/i, "context"],
];

const NEGATIVE = /^(never|don'?t|do not|avoid|must not|should not|shouldn'?t|no\s)/i;
const DIRECTIVE = /\b(must|should|always|never|use|ensure|make sure|prefer|require[sd]?|need to|do not|don'?t|avoid)\b/i;
const EXAMPLE = /^(e\.g\.|example:|for example|for instance)/i;

function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
}

function headingOf(line: string): string | null {
  const md = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/);
  if (md) return md[1];
  const colon = line.match(/^\s*([A-Za-z][A-Za-z '\-/]{1,40}):\s*$/);
  return colon ? colon[1] : null;
}

function bucketForHeading(heading: string): Bucket | null {
  for (const [re, bucket] of HEADING_BUCKETS) if (re.test(heading)) return bucket;
  return null;
}

// Split a paragraph into sentences, keeping "e.g." and similar intact.
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'`(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function classify(sentence: string): Bucket {
  if (EXAMPLE.test(sentence)) return "examples";
  if (NEGATIVE.test(sentence)) return "antiPatterns";
  if (DIRECTIVE.test(sentence)) return "rules";
  return "context";
}

export function convertWithoutAI(input: BasicSkillInput): GeneratedSkill {
  const original = input.content.replace(/\r\n/g, "\n").trim();
  const buckets: Record<Bucket, string[]> = { rules: [], examples: [], antiPatterns: [], context: [] };
  const codeExamples: GeneratedSkill["examples"] = [];

  // 1. Pull out fenced code blocks as examples.
  const withoutCode = original.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    codeExamples.push({
      title: `Example ${codeExamples.length + 1}${lang ? ` (${lang})` : ""}`,
      description: "Code provided in the input.",
      input: "",
      output: "",
      code: code.trimEnd(),
    });
    return "\n";
  });

  // 2. Walk lines. Headings choose a bucket; otherwise classify each sentence.
  let current: Bucket | null = null;
  for (const rawLine of withoutCode.split("\n")) {
    if (!rawLine.trim()) continue;
    const heading = headingOf(rawLine);
    if (heading) {
      current = bucketForHeading(heading);
      continue;
    }
    const line = stripBullet(rawLine);
    const parts = /^\s*(?:[-*•]|\d+[.)])\s+/.test(rawLine) ? [line] : sentences(line);
    for (const part of parts) buckets[current ?? classify(part)].push(part);
  }

  const unique = (list: string[]) => Array.from(new Set(list));
  // Description = first sentence of plain text (headings skipped so they do not leak in).
  const plainText = withoutCode.split("\n").filter((l) => l.trim() && !headingOf(l)).map(stripBullet).join(" ");
  const firstSentence = sentences(plainText)[0] ?? original;
  const nameSource = input.name?.trim() || firstSentence.split(/\s+/).slice(0, 5).join(" ");
  const tags = unique(
    [...(input.tags ?? []), ...(input.technology ?? "").split(","), input.category ?? ""]
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );

  return {
    name: toKebabCase(nameSource),
    version: "1.0.0",
    description: firstSentence.length > 200 ? `${firstSentence.slice(0, 197)}...` : firstSentence,
    instructions: original,
    rules: unique(buckets.rules),
    examples: [
      ...buckets.examples.map((text, i) => ({ title: `Example ${i + 1}`, description: text, input: "", output: "" })),
      ...codeExamples,
    ],
    antiPatterns: unique(buckets.antiPatterns),
    context: buckets.context.join("\n"),
    tags,
    metadata: { generator: "rule-based" },
  };
}
