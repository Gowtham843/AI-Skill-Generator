import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [],
  session: {
    strategy: "jwt",
  },
  // For local single-user: auto-create a user on first access
  // The credentials provider is disabled; we use a simple session
  secret: process.env.NEXTAUTH_SECRET || "skill-platform-dev-secret",
};
