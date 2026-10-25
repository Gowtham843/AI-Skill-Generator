import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canonicalFromRecord, generateForPlatform, PLATFORMS } from "@/lib/adapters/index";

const pre = { background: "#f3f4f6", padding: "1rem", borderRadius: "0.25rem", overflow: "auto", fontSize: "0.75rem", whiteSpace: "pre-wrap" } as const;

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const skill = await prisma.skill.findFirst({ where: { id, ownerId: user.id } });
  if (!skill) return <div style={{ padding: "2rem" }}><h1>Skill not found</h1></div>;

  const canonical = canonicalFromRecord(skill);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <h1>Export: {skill.name}</h1>
      <p style={{ color: "#6b7280" }}>Create each file at the path shown, from your project root.</p>
      {PLATFORMS.map((platform) => (
        <details key={platform} open={platform === "cursor"} style={{ marginTop: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
          <summary style={{ fontWeight: 600 }}>{platform}</summary>
          {Object.entries(generateForPlatform(canonical, platform)).map(([path, content]) => (
            <div key={path}>
              <p><code>{path}</code></p>
              <pre style={pre}>{content}</pre>
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
