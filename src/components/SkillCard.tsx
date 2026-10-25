export default function SkillCard({ skill }: { skill: any }) {
  return (
    <div className="skill-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.125rem" }}>{skill.name}</h2>
        <span style={{ background: "#e5e7eb", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem" }}>
          v{skill.version}
        </span>
      </div>
      <p style={{ color: "#6b7280", marginBottom: "0.5rem" }}>{skill.description}</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        {skill.tags?.map((t: string) => (
          <span key={t} style={{ background: "#dbeafe", color: "#1e40af", padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.75rem" }}>{t}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <a href={`/skill/${skill.id}`}><button className="btn-primary">Open</button></a>
        <a href={`/skill/${skill.id}/edit`}><button className="btn-secondary">Edit</button></a>
      </div>
      <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#9ca3af" }}>
        {skill.visibility} · {new Date(skill.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
