import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canonicalFromRecord, installScript, PLATFORMS } from "@/lib/adapters/index";

const pre = { background: "#111827", color: "#f9fafb", padding: "1rem", borderRadius: "0.25rem", overflow: "auto", fontSize: "0.75rem", whiteSpace: "pre-wrap" } as const;

export default async function InstallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const skill = await prisma.skill.findFirst({ where: { id, ownerId: user.id } });
  if (!skill) return <div style={{ padding: "2rem" }}><h1>Skill not found</h1></div>;

  const canonical = canonicalFromRecord(skill);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1>Install: {skill.name}</h1>
      <p style={{ color: "#6b7280" }}>Open a terminal in your project root, then paste the script for your tool.</p>
      {PLATFORMS.map((platform) => (
        <details key={platform} open={platform === "cursor"} style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <summary style={{ fontWeight: 600 }}>{platform}</summary>
          <pre style={pre}>{installScript(canonical, platform)}</pre>
        </details>
      ))}
    </div>
  );
}
