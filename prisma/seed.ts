import { prisma } from "../src/lib/prisma";
import { SERVICE_DATA } from "../src/consts";

async function main() {
  console.log("Seeding work types from constants...");

  for (const group of SERVICE_DATA.services) {
    for (const item of group.items) {
      await prisma.workType.upsert({
        where: { name: item.title },
        update: {
          description: item.description,
        },
        create: {
          name: item.title,
          description: item.description,
          duration: 60, // Default duration
        },
      });
      console.log(`- Upserted: ${item.title}`);
    }
  }

  console.log("Seeding availability...");
  // Mon-Fri 09:00 - 18:00
  for (let i = 1; i <= 5; i++) {
    const existing = await prisma.availability.findFirst({
      where: { dayOfWeek: i },
    });
    if (!existing) {
      await prisma.availability.create({
        data: { dayOfWeek: i, startTime: "09:00", endTime: "18:00" },
      });
    }
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
