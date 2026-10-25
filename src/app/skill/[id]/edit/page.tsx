"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function SkillEditor() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState("{}");
  const [name, setName] = useState("Unknown Skill");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [technology, setTechnology] = useState("");
  const [activeTab, setActiveTab] = useState("metadata");
  const [message, setMessage] = useState("");

  // Fetch skill data
  useEffect(() => {
    (async () => {
    try {
      const res = await fetch(`/api/skills/${id}`);
      const skill = await res.json();
      if (res.ok) {
        setContent(skill.content || "{}");
        setName(skill.name);
        setDescription(skill.description || "");
        setTags(skill.tags || "");
        setCategory(skill.category || "");
        setTechnology(skill.technology || "");
      }
    } catch (e) {
      console.error("Failed to load skill", e);
    }
    })();
  }, [id]);

  const save = async (status?: "PUBLISHED") => {
    setMessage("Saving...");
    // Drop empty lines left while typing in the one-per-line fields.
    const cleaned = JSON.parse(content);
    for (const key of ["rules", "antiPatterns"]) {
      if (Array.isArray(cleaned[key])) cleaned[key] = cleaned[key].filter((v: string) => v.trim());
    }
    const res = await fetch(`/api/skills/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, tags, category, technology, content: cleaned, ...(status ? { status } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? (status ? "Published." : "Saved.") : `Not saved: ${(data.errors ?? [data.error]).join(", ")}`);
  };

  const updateSection = (section: string, value: unknown) => {
    setContent(JSON.stringify({ ...JSON.parse(content), [section]: value }));
  };

  const tabs = ["metadata", "instructions", "rules", "examples", "anti-patterns", "context"];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Edit: {name}</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              background: activeTab === tab ? "#4f46e5" : "white",
              color: activeTab === tab ? "white" : "#374151",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          {activeTab === "metadata" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem", marginTop: "1rem" }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem", marginTop: "1rem" }}>Tags (comma-separated)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} />
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem", marginTop: "1rem" }}>Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} />
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem", marginTop: "1rem" }}>Technology</label>
              <input value={technology} onChange={(e) => setTechnology(e.target.value)} />
            </div>
          )}

          {activeTab === "instructions" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Instructions</label>
              <textarea
                value={JSON.parse(content).instructions ?? ""}
                onChange={(e) => updateSection("instructions", e.target.value)}
                style={{ minHeight: "400px" }}
              />
            </div>
          )}

          {activeTab === "rules" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Rules (one per line)</label>
              <textarea
                value={(JSON.parse(content).rules ?? []).join("\n")}
                onChange={(e) => updateSection("rules", e.target.value.split("\n"))}
                style={{ minHeight: "300px" }}
              />
            </div>
          )}

          {activeTab === "examples" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Examples</label>
              <textarea
                value={JSON.stringify(JSON.parse(content).examples ?? [], null, 2)}
                onChange={(e) => {
                  try { updateSection("examples", JSON.parse(e.target.value)); } catch {}
                }}
                style={{ minHeight: "300px", fontFamily: "monospace" }}
              />
            </div>
          )}

          {activeTab === "anti-patterns" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Anti-patterns (one per line)</label>
              <textarea
                value={(JSON.parse(content).antiPatterns ?? []).join("\n")}
                onChange={(e) => updateSection("antiPatterns", e.target.value.split("\n"))}
                style={{ minHeight: "200px" }}
              />
            </div>
          )}

          {activeTab === "context" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Context</label>
              <textarea
                value={JSON.parse(content).context ?? ""}
                onChange={(e) => updateSection("context", e.target.value)}
                style={{ minHeight: "200px" }}
              />
            </div>
          )}

        </div>

        <div>
          <h2 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem", marginBottom: "1rem" }}>Live Preview</h2>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0 }}>{name}</h3>
            <p style={{ color: "#6b7280" }}>{description}</p>
            {JSON.parse(content).instructions && (
              <div style={{ whiteSpace: "pre-wrap" }}>{JSON.parse(content).instructions}</div>
            )}
            {JSON.parse(content).rules?.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <strong>Rules:</strong>
                <ol style={{ lineHeight: "2" }}>
                  {JSON.parse(content).rules.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ol>
              </div>
            )}
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
            <button style={{ padding: "0.5rem 1rem", background: "#10b981", color: "white", borderRadius: "0.375rem", border: "none", cursor: "pointer" }} onClick={() => save()}>
              Save Draft
            </button>
            <button style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "white", borderRadius: "0.375rem", border: "none", cursor: "pointer" }} onClick={() => save("PUBLISHED")}>
              Publish
            </button>
            <Link href={`/skill/${id}/export`} style={{ padding: "0.5rem 1rem" }}>Export</Link>
          </div>
          {message && <p style={{ marginTop: "0.75rem", color: "#374151" }}>{message}</p>}
        </div>
      </div>
    </div>
  );
}
