"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { skillToMarkdown } from "@/lib/skill/schema";
import type { GeneratedSkill } from "@/lib/validation/validators";

type Mode = "basic" | "ai";
type KeySource = "server" | "custom";

const inputStyle = { width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" };
const labelStyle = { display: "block", fontWeight: "500", marginBottom: "0.25rem" } as const;

export default function CreatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("basic");
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [technology, setTechnology] = useState("");
  const [tags, setTags] = useState("");
  const [gemini, setGemini] = useState<{ geminiConfigured: boolean; model: string } | null>(null);
  const [keySource, setKeySource] = useState<KeySource>("server");
  const [apiKey, setApiKey] = useState(""); // kept in memory only, never stored
  const [showKey, setShowKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [skill, setSkill] = useState<GeneratedSkill | null>(null);

  useEffect(() => {
    fetch("/api/skills/generate")
      .then((r) => r.json())
      .then((s) => {
        setGemini(s);
        if (!s.geminiConfigured) setKeySource("custom");
      })
      .catch(() => setGemini({ geminiConfigured: false, model: "" }));
  }, []);

  const handleGenerate = async () => {
    setError("");
    if (content.trim().length < 10) return setError("Please describe the skill in at least 10 characters.");
    if (mode === "ai" && keySource === "custom" && !apiKey.trim()) return setError("Please paste your Gemini API key.");
    setGenerating(true);
    try {
      const res = await fetch("/api/skills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          content,
          name: name || undefined,
          category: category || undefined,
          technology: technology || undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          ...(mode === "ai" ? { keySource, ...(keySource === "custom" ? { apiKey } : {}) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected server response." }));
      if (!res.ok) setError(data.error ?? "Generation failed.");
      else setSkill(data.skill);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!skill) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, category: category || undefined, technology: technology || undefined }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected server response." }));
      if (!res.ok) setError(data.error ?? "Save failed.");
      else router.push(`/skill/${data.skill.id}/edit`);
    } finally {
      setSaving(false);
    }
  };

  const markdown = skill
    ? skillToMarkdown({ ...skill, category, technology, compatibility: [], references: [], tests: [] })
    : "";

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Create a Skill</h1>

      <div style={{ marginBottom: "1.5rem" }}>
        <span style={labelStyle}>Generation mode</span>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <label><input type="radio" checked={mode === "basic"} onChange={() => setMode("basic")} /> Without AI — Free</label>
          <label><input type="radio" checked={mode === "ai"} onChange={() => setMode("ai")} /> With AI — Gemini</label>
        </div>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {mode === "basic"
            ? "Basic, rule-based conversion (not AI). Your text is split into rules, examples, anti-patterns and context. Nothing new is added."
            : `Gemini rewrites your input into a structured Skill${gemini?.model ? ` using ${gemini.model}` : ""}. Review it before saving.`}
        </p>
      </div>

      {mode === "ai" && (
        <div style={{ marginBottom: "1.5rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "1rem" }}>
          <span style={labelStyle}>Gemini API key</span>
          <label style={{ display: "block", marginBottom: "0.5rem", color: gemini?.geminiConfigured ? undefined : "#9ca3af" }}>
            <input type="radio" disabled={!gemini?.geminiConfigured} checked={keySource === "server"} onChange={() => setKeySource("server")} />{" "}
            Use configured Gemini API key {gemini?.geminiConfigured ? "✓ configured on server" : "(not set — add GEMINI_API_KEY to .env.local)"}
          </label>
          <label style={{ display: "block" }}>
            <input type="radio" checked={keySource === "custom"} onChange={() => setKeySource("custom")} /> Enter an API key
          </label>
          {keySource === "custom" && (
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key"
                  autoComplete="off"
                  spellCheck={false}
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowKey(!showKey)} style={{ padding: "0.5rem 0.75rem" }}>
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                Used only for this request. Not saved anywhere. Get a key at aistudio.google.com/apikey.
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>Skill Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., php-backend-development" style={inputStyle} />
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={labelStyle}>Describe what this skill should know:</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="In our PHP backend, never query the database directly from controllers. Use the repository layer. All APIs must validate permissions before loading resources. Use our existing response helper instead of returning arrays directly."
          style={{ ...inputStyle, minHeight: "300px", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={labelStyle}>Category (optional)</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Backend" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Technology</label>
          <input type="text" value={technology} onChange={(e) => setTechnology(e.target.value)} placeholder="e.g., PHP, MySQL" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., php, backend" style={inputStyle} />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{ padding: "0.75rem 2rem", fontSize: "1rem", background: generating ? "#6b7280" : "#4f46e5", color: "white", border: "none", borderRadius: "0.375rem", cursor: generating ? "not-allowed" : "pointer" }}
      >
        {generating ? "Generating..." : mode === "basic" ? "Convert (Without AI)" : "Generate with Gemini"}
      </button>

      {error && <p role="alert" style={{ color: "#b91c1c", marginTop: "1rem" }}>{error}</p>}

      {skill && (
        <div style={{ marginTop: "2rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.375rem", padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Review before saving</h3>
          <label style={labelStyle}>Name</label>
          <input value={skill.name} onChange={(e) => setSkill({ ...skill, name: e.target.value })} style={inputStyle} />
          <label style={{ ...labelStyle, marginTop: "0.75rem" }}>Description</label>
          <textarea value={skill.description} onChange={(e) => setSkill({ ...skill, description: e.target.value })} style={{ ...inputStyle, fontFamily: "inherit" }} />
          <details open style={{ margin: "1rem 0" }}>
            <summary>SKILL.md preview</summary>
            <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "0.25rem", overflow: "auto", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{markdown}</pre>
          </details>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: "0.5rem 1rem", background: "#10b981", color: "white", borderRadius: "0.375rem", border: "none", fontSize: "0.875rem" }}>
              {saving ? "Saving..." : "Save & edit all sections"}
            </button>
            <button onClick={() => setSkill(null)} style={{ padding: "0.5rem 1rem", background: "#6b7280", color: "white", borderRadius: "0.375rem", border: "none", fontSize: "0.875rem" }}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
