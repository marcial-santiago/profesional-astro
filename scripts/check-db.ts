import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== StripeEventLog (last 5) ===");
  const logs = await prisma.stripeEventLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(JSON.stringify(logs, null, 2));

  console.log("\n=== Visits (last 5) ===");
  const visits = await prisma.visit.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { workType: true },
  });
  console.log(JSON.stringify(visits, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
