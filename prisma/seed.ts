import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const roles = [
  { key: "CUSTOMER", name: "Customer" },
  { key: "SUPER_ADMIN", name: "Super Admin" },
  { key: "OPERATIONS_ADMIN", name: "Operations Admin" },
  { key: "SUPPORT_AGENT", name: "Support Agent" }
];

const categories = [
  { name: "Puja Samagri", slug: "puja-samagri", type: "PRODUCT", sortOrder: 10 },
  { name: "Festival Essentials", slug: "festival-essentials", type: "PRODUCT", sortOrder: 20 },
  {
    name: "Rudraksha & Spiritual Items",
    slug: "rudraksha-spiritual-items",
    type: "PRODUCT",
    sortOrder: 30
  },
  { name: "Books & Knowledge", slug: "books-knowledge", type: "PRODUCT", sortOrder: 40 },
  { name: "Puja Services", slug: "puja-services", type: "SERVICE", sortOrder: 50 },
  { name: "Asthi Visarjan", slug: "asthi-visarjan", type: "SERVICE", sortOrder: 60 },
  { name: "Kundli & Astrology", slug: "kundli-astrology", type: "SERVICE", sortOrder: 70 },
  { name: "Membership", slug: "membership", type: "MIXED", sortOrder: 80 }
];

const catalogItems = [
  {
    categorySlug: "festival-essentials",
    type: "PHYSICAL",
    title: "Raksha Bandhan Puja Thali",
    slug: "raksha-bandhan-puja-thali",
    shortDescription: "A festive thali set prepared for Raksha Bandhan rituals at home.",
    description: "Demo catalog item for festival essentials. Includes placeholder content only.",
    basePrice: 599,
    mrp: 799,
    sku: "OMD-RB-THALI",
    featured: true,
    sortOrder: 10
  },
  {
    categorySlug: "rudraksha-spiritual-items",
    type: "PHYSICAL",
    title: "Rudraksha Mala",
    slug: "rudraksha-mala",
    shortDescription: "A devotional mala for daily japa and spiritual practice.",
    description: "Demo spiritual item with placeholder description and pricing.",
    basePrice: 899,
    mrp: 1299,
    sku: "OMD-RUD-MALA",
    featured: true,
    sortOrder: 20
  },
  {
    categorySlug: "puja-samagri",
    type: "PHYSICAL",
    title: "Ganga Jal Bottle",
    slug: "ganga-jal-bottle",
    shortDescription: "Sacred Ganga Jal bottle for puja and home rituals.",
    description: "Demo product record. Fulfillment and inventory are not active in Phase 2.",
    basePrice: 149,
    mrp: 199,
    sku: "OMD-GANGA-JAL",
    featured: false,
    sortOrder: 30
  },
  {
    categorySlug: "puja-samagri",
    type: "PACKAGE",
    title: "Satvik Puja Samagri Kit",
    slug: "satvik-puja-samagri-kit",
    shortDescription: "A curated samagri kit for common household puja needs.",
    description: "Demo package catalog record. No cart or checkout logic is attached.",
    basePrice: 1299,
    mrp: 1599,
    sku: "OMD-SAMAGRI-KIT",
    featured: true,
    sortOrder: 40
  },
  {
    categorySlug: "puja-services",
    type: "SERVICE",
    title: "Rudrabhishek Puja Service",
    slug: "rudrabhishek-puja-service",
    shortDescription: "Priest-assisted Rudrabhishek service listing placeholder.",
    description: "Demo service listing. Booking, capacity, and payment will come later.",
    basePrice: 3100,
    mrp: null,
    sku: "OMD-SVC-RUDRA",
    featured: true,
    sortOrder: 50
  },
  {
    categorySlug: "kundli-astrology",
    type: "DIGITAL",
    title: "Kundli Basic Report",
    slug: "kundli-basic-report",
    shortDescription: "A basic astrology report listing for Phase 2 catalog discovery.",
    description: "Demo digital/service catalog item. Report generation is not implemented.",
    basePrice: 499,
    mrp: 699,
    sku: "OMD-KUNDLI-BASIC",
    featured: false,
    sortOrder: 60
  },
  {
    categorySlug: "asthi-visarjan",
    type: "SERVICE",
    title: "Asthi Visarjan Assistance",
    slug: "asthi-visarjan-assistance",
    shortDescription: "Support listing for Asthi Visarjan service discovery.",
    description: "Demo service item only. Application workflow remains a placeholder.",
    basePrice: 5100,
    mrp: null,
    sku: "OMD-SVC-ASTHI",
    featured: true,
    sortOrder: 70
  },
  {
    categorySlug: "membership",
    type: "MEMBERSHIP",
    title: "Divya Membership",
    slug: "divya-membership",
    shortDescription: "Membership listing placeholder for future benefits and rewards.",
    description: "Demo membership catalog item. Wallet rewards remain disabled/mock.",
    basePrice: 999,
    mrp: 1499,
    sku: "OMD-DIVYA-MEMBER",
    featured: false,
    sortOrder: 80
  }
];

async function assignRole(tenantId: string, userId: string, roleKey: string) {
  const role = await prisma.role.findUniqueOrThrow({
    where: {
      tenantId_key: {
        tenantId,
        key: roleKey
      }
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: role.id
      }
    },
    update: {},
    create: {
      tenantId,
      userId,
      roleId: role.id
    }
  });
}

async function seedCatalog(tenantId: string) {
  const categoryBySlug = new Map<string, { id: string }>();

  for (const category of categories) {
    const savedCategory = await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: category.slug
        }
      },
      update: {
        name: category.name,
        type: category.type,
        status: "ACTIVE",
        sortOrder: category.sortOrder
      },
      create: {
        tenantId,
        name: category.name,
        slug: category.slug,
        type: category.type,
        status: "ACTIVE",
        sortOrder: category.sortOrder
      },
      select: { id: true }
    });

    categoryBySlug.set(category.slug, savedCategory);
  }

  for (const item of catalogItems) {
    const category = categoryBySlug.get(item.categorySlug);

    const product = await prisma.product.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: item.slug
        }
      },
      update: {
        categoryId: category?.id,
        type: item.type,
        title: item.title,
        shortDescription: item.shortDescription,
        description: item.description,
        status: "ACTIVE",
        basePrice: item.basePrice,
        mrp: item.mrp,
        currency: "INR",
        featured: item.featured,
        sortOrder: item.sortOrder
      },
      create: {
        tenantId,
        categoryId: category?.id,
        type: item.type,
        title: item.title,
        slug: item.slug,
        shortDescription: item.shortDescription,
        description: item.description,
        status: "ACTIVE",
        basePrice: item.basePrice,
        mrp: item.mrp,
        currency: "INR",
        featured: item.featured,
        sortOrder: item.sortOrder
      }
    });

    await prisma.productVariant.upsert({
      where: { sku: item.sku },
      update: {
        productId: product.id,
        title: "Default",
        price: item.basePrice,
        mrp: item.mrp,
        active: true,
        stockStatus: "IN_STOCK"
      },
      create: {
        productId: product.id,
        sku: item.sku,
        title: "Default",
        price: item.basePrice,
        mrp: item.mrp,
        active: true,
        stockStatus: "IN_STOCK"
      }
    });
  }
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "omdivyadarshan" },
    update: {
      name: "OMDivyaDarshan",
      domain: "app.omdivyadarshan.org"
    },
    create: {
      slug: "omdivyadarshan",
      name: "OMDivyaDarshan",
      domain: "app.omdivyadarshan.org"
    }
  });

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: role.key
        }
      },
      update: { name: role.name },
      create: {
        tenantId: tenant.id,
        key: role.key,
        name: role.name
      }
    });
  }

  const customer = await prisma.user.upsert({
    where: { email: "customer@omdivyadarshan.local" },
    update: {
      name: "Demo Customer",
      passwordHash: await hashPassword("Password@123"),
      status: "ACTIVE",
      verifiedEmail: true
    },
    create: {
      tenantId: tenant.id,
      email: "customer@omdivyadarshan.local",
      name: "Demo Customer",
      passwordHash: await hashPassword("Password@123"),
      status: "ACTIVE",
      verifiedEmail: true
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@omdivyadarshan.local" },
    update: {
      name: "Demo Super Admin",
      passwordHash: await hashPassword("Admin@123"),
      status: "ACTIVE",
      verifiedEmail: true
    },
    create: {
      tenantId: tenant.id,
      email: "admin@omdivyadarshan.local",
      name: "Demo Super Admin",
      passwordHash: await hashPassword("Admin@123"),
      status: "ACTIVE",
      verifiedEmail: true
    }
  });

  await assignRole(tenant.id, customer.id, "CUSTOMER");
  await assignRole(tenant.id, admin.id, "SUPER_ADMIN");
  await seedCatalog(tenant.id);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
