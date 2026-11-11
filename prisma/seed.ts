// Creates the first superadmin and the two sample permission groups.
// Run with: npm run db:seed   (needs SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD)
import { PrismaClient } from "@prisma/client";
import { MIN_PASSWORD_LENGTH, hashPassword } from "../lib/auth/password-hashing";
import { DEFAULT_GROUPS } from "../lib/permissions/permission-keys";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!email || !password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Set SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters).`,
    );
  }

  // An existing account is left untouched, so re-running never resets a password.
  const existing = await db.staff.findUnique({ where: { email } });
  if (existing) {
    console.log(`Superadmin ${email} already exists, skipped.`);
  } else {
    await db.staff.create({
      data: { email, fullName: "Superadmin", isSuperadmin: true, passwordHash: await hashPassword(password) },
    });
    console.log(`Created superadmin ${email}.`);
  }

  for (const group of DEFAULT_GROUPS) {
    const found = await db.permissionGroup.findUnique({ where: { name: group.name } });
    if (found) continue;
    await db.permissionGroup.create({
      data: {
        name: group.name,
        description: group.description,
        permissions: { create: group.permissions.map((permissionKey) => ({ permissionKey })) },
      },
    });
    console.log(`Created group ${group.name}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
