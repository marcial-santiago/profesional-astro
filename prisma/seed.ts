import { prisma } from "../src/lib/prisma";

const SEED_DATA = [
  // Cleaning
  { name: "Residential Cleaning", description: "Comprehensive home cleaning service, adaptable to your needs.", category: "cleaning" as const },
  { name: "Commercial Cleaning", description: "We keep your workspace spotless, contributing to a productive environment.", category: "cleaning" as const },
  { name: "Deep Cleaning", description: "A detailed service for thorough cleaning of every corner.", category: "cleaning" as const },
  { name: "Post-Construction Cleaning", description: "We remove debris and dust after any construction or renovation project.", category: "cleaning" as const },
  // Plumbing
  { name: "Leak Repairs", description: "Efficient identification and repair of pipe and faucet leaks.", category: "plumbing" as const },
  { name: "Pipe Installation", description: "Professional installation of pipe systems for new builds or renovations.", category: "plumbing" as const },
  { name: "Drain Unclogging", description: "Fast and effective service to unclog drains and pipes.", category: "plumbing" as const },
  // Construction
  { name: "Residential Construction", description: "Development of single-family and multi-family homes tailored to your preferences.", category: "construction" as const },
  { name: "Commercial Construction", description: "Development of functional and aesthetic commercial spaces for your business.", category: "construction" as const },
  { name: "Remodeling and Additions", description: "We transform and expand your existing spaces, giving them new life.", category: "construction" as const },
];

async function main() {
  console.log("Seeding work types...");

  for (const item of SEED_DATA) {
    await prisma.workType.upsert({
      where: { name: item.name },
      update: {
        description: item.description,
        category: item.category,
      },
      create: {
        name: item.name,
        description: item.description,
        category: item.category,
        duration: 60,
        price: 10,
        isActive: true,
      },
    });
    console.log(`- Upserted: ${item.name}`);
  }

  console.log("Seeding availability...");
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
