import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
  const testCases = body.testCases as Array<{
    name: string;
    input: string;
    expected: string;
  }>;

  if (!testCases || testCases.length === 0) {
    return NextResponse.json({ error: "No test cases provided" }, { status: 400 });
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await prisma.skillTest.create({
      data: {
        skillId: id,
        name: testCase.name,
        description: `Test: ${testCase.name}`,
        input: testCase.input,
        expected: testCase.expected,
        createdBy: user.id,
      },
    });

    await prisma.skillTestResult.create({
      data: {
        testId: result.id,
        passed: false,
        output: "Pending evaluation",
        score: 0,
      },
    });

    results.push(result);
  }

  return NextResponse.json({
    testCases: results.length,
    message: "Tests created. Evaluation will run asynchronously.",
    results,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  const skill = await prisma.skill.findFirst({ where: { id, ownerId: user.id } });
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const tests = await prisma.skillTest.findMany({
    where: { skillId: id },
    include: {
      results: { orderBy: { createdAt: "desc" }, take: 10 },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPassed = tests.filter((t) =>
    t.results.some((r) => r.passed)
  ).length;
  const totalFailed = tests.length - totalPassed;
  const score = tests.length > 0 ? (totalPassed / tests.length) * 100 : 0;

  return NextResponse.json({
    tests,
    summary: { total: tests.length, passed: totalPassed, failed: totalFailed, score },
  });
}
