import { prisma } from "@/lib/db";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

// Always read fresh data; never prerender the skill list at build time.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  const skills = await prisma.skill.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>My Skills</h1>
        <Link href="/create" style={{ padding: "0.5rem 1.5rem", background: "#4f46e5", color: "white", borderRadius: "0.375rem", border: "none", textDecoration: "none" }}>Create Skill</Link>
      </div>
      {skills.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
          <p style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>No skills yet.</p>
          <p>Create your first skill to get started.</p>
          <Link href="/create" style={{ padding: "0.5rem 1.5rem", background: "#4f46e5", color: "white", borderRadius: "0.375rem", border: "none", marginTop: "1rem", textDecoration: "none" }}>Create Skill</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          {skills.map((skill) => (
            <div key={skill.id} style={{
              border: "1px solid #e5e7eb",
              borderRadius: "0.375rem",
              padding: "1rem",
              background: "white",
              marginBottom: "1rem",
            }}>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", color: "#1f2937" }}>{skill.name}</h3>
              <p style={{ color: "#6b7280", marginBottom: "0.5rem" }}>{skill.description}</p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                {skill.tags?.split(",").filter(Boolean).map((t: string) => (
                  <span key={t} style={{ background: "#dbeafe", color: "#1e40af", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem", marginBottom: "0.5rem" }}>{t}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <a href={`/skill/${skill.id}`} style={{ padding: "0.375rem 0.75rem", background: "#e5e7eb", color: "#374151", borderRadius: "0.25rem", border: "none", fontSize: "0.75rem", textDecoration: "none" }}>Open</a>
                <a href={`/skill/${skill.id}/edit`} style={{ padding: "0.375rem 0.75rem", background: "#d1d5db", color: "#374151", borderRadius: "0.25rem", border: "none", fontSize: "0.75rem", textDecoration: "none" }}>Edit</a>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>v{skill.version} · {skill.visibility}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
