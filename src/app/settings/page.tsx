import Link from "next/link";

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Settings</h1>
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.5rem", marginTop: "1rem" }}>
        <h2>LLM Providers</h2>
        <p style={{ color: "#6b7280" }}>Configure your preferred LLM provider for skill generation.</p>
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Default Provider</label>
            <select style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}>Model</label>
            <input type="text" defaultValue="gpt-4o" style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
