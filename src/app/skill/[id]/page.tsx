import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function SkillDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const skill = await prisma.skill.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        { visibility: "PUBLIC" },
      ],
    },
    include: {
      owner: { select: { name: true } },
      versions: { orderBy: { createdAt: "desc" }, take: 10 },
      tests: { include: { results: true } },
      installations: { orderBy: { installedAt: "desc" } },
    },
  });

  if (!skill) return <div style={{ padding: "2rem" }}><h1>Skill not found</h1></div>;

  const content = JSON.parse(skill.content ?? "{}");

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.5rem 0" }}>{skill.name}</h1>
          <p style={{ color: "#6b7280", marginBottom: "0.5rem" }}>{skill.description}</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {skill.tags?.split(",").filter(Boolean).map((t: string) => (
              <span key={t} style={{ background: "#dbeafe", color: "#1e40af", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem" }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href={`/skill/${skill.id}/edit`}><button className="btn-primary">Edit</button></Link>
          <Link href={`/skill/${skill.id}/export`}><button className="btn-secondary">Export</button></Link>
          <Link href={`/skill/${skill.id}/install`}><button className="btn-secondary">Install</button></Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>Metadata</h2>
          <pre style={{ background: "#f9fafb", padding: "1rem", borderRadius: "0.375rem", overflow: "auto" }}>
            {JSON.stringify({ name: skill.name, version: skill.version, description: skill.description, tags: skill.tags?.split(",").filter(Boolean), category: skill.category, technology: skill.technology, visibility: skill.visibility }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>Versions</h2>
          {skill.versions?.length ? (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {skill.versions.map((v: any) => (
                <li key={v.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                  v{v.version} - {new Date(v.createdAt).toLocaleDateString()} - {v.status}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#9ca3af" }}>No versions yet</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>Instructions</h2>
        <div style={{ background: "#f9fafb", padding: "1.5rem", borderRadius: "0.375rem", whiteSpace: "pre-wrap" }}>
          {content.instructions ?? "No instructions yet"}
        </div>
      </div>

      {content.rules?.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>Rules</h2>
          <ol style={{ lineHeight: "2" }}>
            {content.rules.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </div>
      )}

      {content.examples?.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>Examples</h2>
          {content.examples.map((ex: any, i: number) => (
            <div key={i} style={{ background: "#f9fafb", padding: "1rem", borderRadius: "0.375rem", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>{ex.title}</h3>
              <p>{ex.description}</p>
              {ex.code && <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "0.25rem" }}>{ex.code}</pre>}
            </div>
          ))}
        </div>
      )}

      {content.antiPatterns?.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>Anti-patterns</h2>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
            {content.antiPatterns.map((ap: string, i: number) => (
              <li key={i}>{ap}</li>
            ))}
          </ul>
        </div>
      )}

      {skill.installations?.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem" }}>Installations</h2>
          {skill.installations.map((inst: any) => (
            <div key={inst.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
              {inst.platform} → {inst.targetPath} ({inst.status})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
