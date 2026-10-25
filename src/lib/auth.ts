import { getServerSession } from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";

const LOCAL_USER_EMAIL = "local@skill-platform.local";

// Local single-user mode: use the signed-in user if there is one,
// otherwise a local user that is created on first access.
export async function getCurrentUser() {
  const session = await getServerSession(authConfig);
  const email = session?.user?.email;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user;
  }
  return prisma.user.upsert({
    where: { email: LOCAL_USER_EMAIL },
    update: {},
    create: { email: LOCAL_USER_EMAIL, name: "Local User" },
  });
}
