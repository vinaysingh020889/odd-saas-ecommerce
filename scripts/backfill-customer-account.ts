import { prisma } from "../lib/prisma";
import { backfillCustomerAccountEntries } from "../lib/customer-account";

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "omdivyadarshan" }, select: { id: true, slug: true } });
  if (!tenant) throw new Error("OMD tenant was not found. Seed the database before running the backfill.");
  const result = await backfillCustomerAccountEntries(tenant.id);
  console.log(JSON.stringify({ tenant: tenant.slug, ...result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
