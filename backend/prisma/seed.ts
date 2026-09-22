import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const accounts = [
    {
      name: "Demo Admin",
      email: "admin@example.com",
      password: "AdminPass123",
      role: Role.ADMIN,
    },
    {
      name: "Demo Staff",
      email: "staff@example.com",
      password: "StaffPass123",
      role: Role.STAFF,
    },
  ];

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        passwordHash,
        role: account.role,
      },
      create: {
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
      },
    });
  }

  console.log("Development accounts created");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });