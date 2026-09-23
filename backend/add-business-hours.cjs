const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.businessHour.upsert({
    where: {
      branchId_dayOfWeek: {
        branchId: 1,
        dayOfWeek: 5,
      },
    },
    update: {
      openTime: "09:00",
      closeTime: "17:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    },
    create: {
      branchId: 1,
      dayOfWeek: 5,
      openTime: "09:00",
      closeTime: "17:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    },
  });

  console.log("Business hours saved:", result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());