import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GitHubService } from "@/lib/github";
import { SkillFromAnalysis } from "@/lib/github";
import { bumpMinor } from "@/lib/skill/schema";

export async function GET(
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

  return NextResponse.json({ skill });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const skill = await prisma.skill.findFirst({ where: { id, ownerId: user.id } });
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const body = await request.json();
  const { owner, repo } = body;

  if (!owner || !repo) {
    return NextResponse.json({ error: "Owner and repo are required" }, { status: 400 });
  }

  try {
    const github = new GitHubService(process.env.GITHUB_PERSONAL_TOKEN ?? "");
    
    // Analyze the repository
    const analysis = await github.analyzeRepository(owner, repo);
    
    // Generate skill from analysis
    const skillData: SkillFromAnalysis = await github.generateSkillFromAnalysis(owner, repo);

    // Create skill version in database
    const contentJson = {
      instructions: skillData.instructions,
      rules: skillData.rules,
      examples: skillData.examples,
      antiPatterns: skillData.antiPatterns,
      context: skillData.context,
      references: [],
      tests: [],
      metadata: {},
    };

    const version = await prisma.skillVersion.create({
      data: {
        skillId: id,
        version: bumpMinor(skill.version),
        content: JSON.stringify(contentJson),
        metadata: JSON.stringify({
          githubSource: `${owner}/${repo}`,
          analysis: JSON.stringify({
            architecture: analysis.architecture,
            technology: skillData.technology,
            patterns: skillData.rules,
          }),
        }),
        status: "PUBLISHED",
        createdBy: user.id,
      },
    });

    // Update the skill's latest version
    await prisma.skill.update({
      where: { id: id },
      data: { version: version.version },
    });

    return NextResponse.json({
      skill: skillData,
      analysis,
      version,
      message: `Skill generated from repository ${owner}/${repo}`,
    });
  } catch (error) {
    console.error("GitHub analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze repository" },
      { status: 500 }
    );
  }
}