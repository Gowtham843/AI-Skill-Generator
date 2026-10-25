"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Simple local auth: just mark as initialized
    // In production, this would check auth status
    setInitialized(true);
  }, []);

  if (!initialized) {
    return <div>Loading...</div>;
  }

  return (
    <SessionProvider>
      <nav style={{
        padding: "1rem 2rem",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
      }}>
        <a href="/" style={{ fontWeight: "bold", fontSize: "1.25rem", textDecoration: "none", color: "#111827" }}>Skill Platform</a>
        <a href="/create" style={{ textDecoration: "none", color: "#4b5563" }}>Create Skill</a>
        <a href="/registry" style={{ textDecoration: "none", color: "#4b5563" }}>Registry</a>
        <a href="/settings" style={{ textDecoration: "none", color: "#4b5563" }}>Settings</a>
      </nav>
      {children}
    </SessionProvider>
  );
}
