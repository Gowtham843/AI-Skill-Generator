import "./globals.css";
import { AuthProvider } from "./providers";

export const metadata = {
  title: "Skill Platform",
  description: "Create, manage, test, version, and deploy reusable AI Skills across coding agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
