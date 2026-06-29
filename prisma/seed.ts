import { PrismaClient, type KundliDeliveryMode, type MembershipBenefitScope, type MembershipBenefitType, type MembershipUsagePeriod } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const roles = [
  { key: "CUSTOMER", name: "Customer" },
  { key: "SUPER_ADMIN", name: "Super Admin" },
  { key: "ADMIN", name: "Admin" },
  { key: "OPERATIONS_ADMIN", name: "Operations Admin" },
  { key: "SUPPORT_AGENT", name: "Support Agent" },
  { key: "PRODUCT_MANAGER", name: "Product Manager" },
  { key: "VENDOR", name: "Vendor" },
  { key: "RURAL_SUBADMIN", name: "Rural Subadmin" },
  { key: "PANDIT", name: "Pandit" },
  { key: "ASTROLOGER", name: "Astrologer" },
  { key: "OPERATOR", name: "Operator" }
];

const categories = [
  {
    name: "Puja Samagri",
    slug: "puja-samagri",
    type: "PRODUCT",
    sortOrder: 10,
    showOnHomepageIntent: true,
    homepageIntentTitle: "Daily Puja Essentials",
    homepageIntentDescription: "Sacred water, thalis, samagri and ritual-ready items for everyday worship.",
    homepageIntentSortOrder: 10,
    isFeatured: true
  },
  { name: "Puja Kits", slug: "puja-kits", type: "PRODUCT", parentSlug: "puja-samagri", sortOrder: 11 },
  { name: "Sacred Waters", slug: "sacred-waters", type: "PRODUCT", parentSlug: "puja-samagri", sortOrder: 12 },
  { name: "Puja Thali", slug: "puja-thali", type: "PRODUCT", parentSlug: "puja-samagri", sortOrder: 13 },
  {
    name: "Festival Essentials",
    slug: "festival-essentials",
    type: "PRODUCT",
    sortOrder: 20,
    showOnHomepageIntent: true,
    homepageIntentTitle: "Festival Preparation",
    homepageIntentDescription: "Seasonal devotional selections prepared for family rituals and celebrations.",
    homepageIntentSortOrder: 20,
    isFeatured: true
  },
  { name: "Raksha Bandhan", slug: "raksha-bandhan", type: "PRODUCT", parentSlug: "festival-essentials", sortOrder: 21 },
  { name: "Diwali Puja", slug: "diwali-puja", type: "PRODUCT", parentSlug: "festival-essentials", sortOrder: 22 },
  {
    name: "Rudraksha & Spiritual Items",
    slug: "rudraksha-spiritual-items",
    type: "PRODUCT",
    sortOrder: 30,
    showOnHomepageIntent: true,
    homepageIntentTitle: "Sadhana & Spiritual Items",
    homepageIntentDescription: "Meaningful spiritual items for daily japa, meditation, and personal devotion.",
    homepageIntentSortOrder: 30,
    isFeatured: true
  },
  { name: "Rudraksha Mala", slug: "rudraksha-mala-category", type: "PRODUCT", parentSlug: "rudraksha-spiritual-items", sortOrder: 31 },
  { name: "Spiritual Accessories", slug: "spiritual-accessories", type: "PRODUCT", parentSlug: "rudraksha-spiritual-items", sortOrder: 32 },
  {
    name: "Books & Knowledge",
    slug: "books-knowledge",
    type: "PRODUCT",
    sortOrder: 40,
    showOnHomepageIntent: true,
    homepageIntentTitle: "Spiritual Knowledge",
    homepageIntentDescription: "Digital and physical knowledge offerings for deeper spiritual clarity.",
    homepageIntentSortOrder: 40,
    isFeatured: false
  },
  { name: "Kundli Reports", slug: "kundli-reports", type: "PRODUCT", parentSlug: "books-knowledge", sortOrder: 41 },
  { name: "Spiritual Guides", slug: "spiritual-guides", type: "PRODUCT", parentSlug: "books-knowledge", sortOrder: 42 },
  {
    name: "Puja Services",
    slug: "puja-services",
    type: "SERVICE",
    sortOrder: 50,
    showOnHomepageIntent: true,
    homepageIntentTitle: "Guided Puja Services",
    homepageIntentDescription: "Priest-assisted seva placeholders with clear next steps for future booking.",
    homepageIntentSortOrder: 50,
    isFeatured: false
  },
  { name: "Rudrabhishek", slug: "rudrabhishek", type: "SERVICE", parentSlug: "puja-services", sortOrder: 51 },
  { name: "Priest Assisted Puja", slug: "priest-assisted-puja", type: "SERVICE", parentSlug: "puja-services", sortOrder: 52 },
  { name: "Asthi Visarjan", slug: "asthi-visarjan", type: "SERVICE", sortOrder: 60 },
  { name: "Kundli & Astrology", slug: "kundli-astrology", type: "SERVICE", sortOrder: 70 },
  {
    name: "Membership",
    slug: "membership",
    type: "MIXED",
    sortOrder: 80,
    showOnHomepageIntent: true,
    homepageIntentTitle: "Divya Membership",
    homepageIntentDescription: "Monthly devotional membership offerings for ongoing participation.",
    homepageIntentSortOrder: 60,
    isFeatured: false
  }
];

const catalogItems = [
  {
    categorySlug: "raksha-bandhan",
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
    categorySlug: "rudraksha-mala-category",
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
    categorySlug: "sacred-waters",
    type: "PHYSICAL",
    title: "Ganga Jal Bottle",
    slug: "ganga-jal-bottle",
    shortDescription: "Sacred Ganga Jal bottle for puja and home rituals.",
    description: "Demo physical product with opening stock for cart, Buy Now, checkout, mock payment, and inventory movement testing.",
    basePrice: 149,
    mrp: 199,
    sku: "OMD-GANGA-JAL",
    featured: false,
    sortOrder: 30
  },
  {
    categorySlug: "puja-kits",
    type: "KIT",
    title: "Satvik Puja Samagri Kit",
    slug: "satvik-puja-samagri-kit",
    shortDescription: "A curated samagri kit for common household puja needs.",
    description: "Demo kit product backed by component SKUs so checkout can reserve and sell component inventory through the mock payment lifecycle.",
    basePrice: 1299,
    mrp: 1599,
    sku: "OMD-SAMAGRI-KIT",
    featured: true,
    sortOrder: 40
  },
  {
    categorySlug: "rudrabhishek",
    type: "SERVICE",
    title: "Rudrabhishek Puja Service",
    slug: "rudrabhishek-puja-service",
    shortDescription: "Priest-assisted Rudrabhishek service listing placeholder.",
    description: "Demo service listing placeholder. Booking calendar and capacity management are intentionally deferred.",
    basePrice: 3100,
    mrp: null,
    sku: "OMD-SVC-RUDRA",
    featured: true,
    sortOrder: 50
  },
  {
    categorySlug: "kundli-reports",
    type: "DIGITAL",
    title: "Kundli Basic Report",
    slug: "kundli-basic-report",
    shortDescription: "A basic astrology report available as digital or printed delivery.",
    description: "Demo digital product with a printed variant option for checkout review. Report generation and print fulfilment are intentionally deferred.",
    basePrice: 499,
    mrp: 699,
    sku: "OMD-KUNDLI-BASIC",
    variantTitle: "Digital Kundli Report",
    variantAttributesJson: {
      deliveryMode: "digital"
    },
    extraVariants: [
      {
        sku: "OMD-KUNDLI-PRINTED",
        title: "Printed Kundli Report",
        price: 799,
        mrp: 999,
        attributesJson: {
          deliveryMode: "physical"
        }
      }
    ],
    featured: false,
    sortOrder: 60
  },
  {
    categorySlug: "asthi-visarjan",
    type: "SERVICE",
    title: "Asthi Visarjan Seva",
    slug: "asthi-visarjan-seva",
    shortDescription: "Respectful Asthi Visarjan assistance with guided application and document review.",
    description: "Asthi Visarjan MVP service package used for application intake, document placeholder upload, mock payment, and customer tracking.",
    basePrice: 5100,
    mrp: null,
    sku: "OMD-ASTHI-KASHI",
    variantTitle: "Kashi Asthi Visarjan",
    variantAttributesJson: {
      location: "Kashi"
    },
    extraVariants: [
      {
        sku: "OMD-ASTHI-HARIDWAR",
        title: "Haridwar Asthi Visarjan",
        price: 4100,
        mrp: null,
        attributesJson: {
          location: "Haridwar"
        }
      },
      {
        sku: "OMD-ASTHI-PRAYAGRAJ",
        title: "Prayagraj Asthi Visarjan",
        price: 4500,
        mrp: null,
        attributesJson: {
          location: "Prayagraj"
        }
      }
    ],
    featured: true,
    sortOrder: 70
  },
  {
    categorySlug: "membership",
    type: "MEMBERSHIP",
    title: "Divya Membership",
    slug: "divya-membership",
    shortDescription: "Monthly membership offerings for ongoing devotional participation.",
    description: "Demo monthly membership product. Mock payment success activates a subscription; renewal automation remains deferred.",
    basePrice: 199,
    mrp: 249,
    sku: "OMD-DIVYA-MEMBER",
    variantTitle: "Nitya Seva Monthly",
    variantAttributesJson: {
      cadence: "monthly",
      offering: "nitya_seva"
    },
    extraVariants: [
      {
        sku: "OMD-MEM-PUJA-SAHYOG",
        title: "Puja Sahyog Monthly",
        price: 499,
        mrp: 599,
        attributesJson: {
          cadence: "monthly",
          offering: "puja_sahyog"
        }
      },
      {
        sku: "OMD-MEM-KUTUMB-SEVA",
        title: "Kutumb Seva Monthly",
        price: 999,
        mrp: 1199,
        attributesJson: {
          cadence: "monthly",
          offering: "kutumb_seva"
        }
      }
    ],
    featured: false,
    sortOrder: 80
  }
];

const tagSeeds = [
  { name: "Shiv", slug: "shiv", type: "DEITY", sortOrder: 10, aliases: ["Shiva", "Mahadev", "Mahadeva", "Shankar", "Bholenath"] },
  { name: "Vishnu", slug: "vishnu", type: "DEITY", sortOrder: 20, aliases: ["Sri Vishnu", "Lord Vishnu", "Narayana", "Hari"] },
  { name: "Durga", slug: "durga", type: "DEITY", sortOrder: 30, aliases: ["Maa Durga", "Devi Durga", "Amba"] },
  { name: "Ganesh", slug: "ganesh", type: "DEITY", sortOrder: 40, aliases: ["Ganesha", "Ganapati", "Vinayak", "Vighnaharta"] },
  { name: "Lakshmi", slug: "lakshmi", type: "DEITY", sortOrder: 50, aliases: ["Maa Lakshmi", "Laxmi", "Shri Lakshmi"] },
  { name: "Sawan", slug: "sawan", type: "FESTIVAL", sortOrder: 60, aliases: ["Shravan", "Savan", "Shravan Maas"] },
  { name: "Shradh", slug: "shradh", type: "OCCASION", sortOrder: 70, aliases: ["Pitru Paksha", "Shraddha", "Pitra Paksha"] },
  { name: "Diwali", slug: "diwali", type: "FESTIVAL", sortOrder: 80, aliases: ["Deepavali", "Dipawali", "Deepotsav"] },
  { name: "Navratri", slug: "navratri", type: "FESTIVAL", sortOrder: 90, aliases: ["Navaratri", "Durga Navratri"] },
  { name: "Raksha Bandhan", slug: "raksha-bandhan-tag", type: "FESTIVAL", sortOrder: 100, aliases: ["Rakhi", "Rakhi Purnima", "Rakshabandhan"] },
  { name: "Kashi", slug: "kashi", type: "PLACE", sortOrder: 110, aliases: ["Varanasi", "Banaras"] },
  { name: "Haridwar", slug: "haridwar", type: "PLACE", sortOrder: 120, aliases: ["Hardwar", "Hari Dwar"] },
  { name: "Prayagraj", slug: "prayagraj", type: "PLACE", sortOrder: 130, aliases: ["Allahabad", "Triveni Sangam"] },
  { name: "Gaya", slug: "gaya", type: "PLACE", sortOrder: 140, aliases: ["Gaya Ji", "Gaya Dham"] },
  { name: "Rudrabhishek", slug: "rudrabhishek-tag", type: "PUJA", sortOrder: 150, aliases: ["Rudra Abhishek", "Rudrabhishekam"] },
  { name: "Belpatra", slug: "belpatra", type: "MATERIAL_ATTRIBUTE", sortOrder: 160, aliases: ["Bilva Patra", "Bel Patra", "Bilpatra"] },
  { name: "Somwar Vrat", slug: "somwar-vrat", type: "RITUAL", sortOrder: 170, aliases: ["Monday Vrat", "Shravan Somwar"] },
  { name: "Pind Daan", slug: "pind-daan-tag", type: "RITUAL", sortOrder: 180, aliases: ["Pinda Daan", "Pitru Pind Daan"] },
  { name: "Tarpan", slug: "tarpan", type: "RITUAL", sortOrder: 190, aliases: ["Tarpana", "Pitru Tarpan"] },
  { name: "Puja Samagri", slug: "puja-samagri-tag", type: "PRODUCT_USE", sortOrder: 200, aliases: ["Pooja Samagri", "Puja Items", "Pooja Items"] }
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

async function seedTagGraph(tenantId: string) {
  for (const item of tagSeeds) {
    const tag = await prisma.tag.upsert({
      where: { tenantId_slug: { tenantId, slug: item.slug } },
      update: {
        name: item.name,
        type: item.type,
        description: `Seed context tag for ${item.name}.`,
        status: "ACTIVE",
        sortOrder: item.sortOrder
      },
      create: {
        tenantId,
        name: item.name,
        slug: item.slug,
        type: item.type,
        description: `Seed context tag for ${item.name}.`,
        status: "ACTIVE",
        sortOrder: item.sortOrder
      }
    });

    await prisma.tagAlias.deleteMany({ where: { tenantId, tagId: tag.id } });
    if (item.aliases.length) {
      await prisma.tagAlias.createMany({
        data: item.aliases.map((value) => ({
          tenantId,
          tagId: tag.id,
          value,
          locale: null,
          kind: "search"
        })),
        skipDuplicates: true
      });
    }
  }
}

async function seedSmartSearchTagRelations(tenantId: string) {
  const [tags, products, categories, campaigns] = await Promise.all([
    prisma.tag.findMany({ where: { tenantId }, select: { id: true, slug: true } }),
    prisma.product.findMany({ where: { tenantId }, select: { id: true, slug: true, type: true } }),
    prisma.category.findMany({ where: { tenantId }, select: { id: true, slug: true } }),
    prisma.festivalCampaign.findMany({ where: { tenantId }, select: { id: true, slug: true } })
  ]);
  const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag]));
  const productBySlug = new Map(products.map((product) => [product.slug, product]));
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const campaignBySlug = new Map(campaigns.map((campaign) => [campaign.slug, campaign]));
  const relations: Array<{ targetType: string; targetId: string; tagId: string; sortOrder: number }> = [];

  function add(targetType: string, targetId: string | undefined, tagSlugs: string[]) {
    if (!targetId) return;
    for (const tagSlug of tagSlugs) {
      const tag = tagBySlug.get(tagSlug);
      if (!tag) continue;
      relations.push({ targetType, targetId, tagId: tag.id, sortOrder: (relations.length + 1) * 10 });
    }
  }

  add("SERVICE", productBySlug.get("rudrabhishek-puja-service")?.id, ["shiv", "rudrabhishek-tag", "sawan"]);
  add("PRODUCT", productBySlug.get("ganga-jal-bottle")?.id, ["kashi", "haridwar", "puja-samagri-tag"]);
  add("PRODUCT", productBySlug.get("raksha-bandhan-puja-thali")?.id, ["raksha-bandhan-tag", "puja-samagri-tag"]);
  add("PRODUCT", productBySlug.get("satvik-puja-samagri-kit")?.id, ["puja-samagri-tag", "sawan", "diwali"]);
  add("SERVICE", productBySlug.get("asthi-visarjan-seva")?.id, ["shradh", "pind-daan-tag", "tarpan", "gaya", "kashi"]);
  add("CATEGORY", categoryBySlug.get("puja-samagri")?.id, ["puja-samagri-tag"]);
  add("CATEGORY", categoryBySlug.get("festival-essentials")?.id, ["raksha-bandhan-tag", "diwali", "navratri"]);
  add("CATEGORY", categoryBySlug.get("asthi-visarjan")?.id, ["shradh", "pind-daan-tag", "tarpan"]);
  add("FESTIVAL_CAMPAIGN", campaignBySlug.get("sawan-shravan-2026")?.id, ["sawan", "shiv", "rudrabhishek-tag"]);
  add("FESTIVAL_CAMPAIGN", campaignBySlug.get("raksha-bandhan-2026")?.id, ["raksha-bandhan-tag"]);
  add("FESTIVAL_CAMPAIGN", campaignBySlug.get("shradh-pitru-paksha-2026")?.id, ["shradh", "pind-daan-tag", "tarpan", "gaya"]);
  add("FESTIVAL_CAMPAIGN", campaignBySlug.get("diwali-2026")?.id, ["diwali", "lakshmi", "puja-samagri-tag"]);

  if (relations.length) {
    await prisma.tagRelation.createMany({
      data: relations.map((relation) => ({
        tenantId,
        tagId: relation.tagId,
        targetType: relation.targetType,
        targetId: relation.targetId,
        context: "default",
        sortOrder: relation.sortOrder
      })),
      skipDuplicates: true
    });
  }
}

async function seedCatalog(tenantId: string) {
  const categoryBySlug = new Map<string, { id: string }>();

  for (const category of categories.filter((item) => !item.parentSlug)) {
    const savedCategory = await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: category.slug
        }
      },
      update: {
        name: category.name,
        parentId: null,
        type: category.type,
        status: "ACTIVE",
        sortOrder: category.sortOrder,
        showOnHomepageIntent: Boolean(category.showOnHomepageIntent),
        homepageIntentTitle: category.homepageIntentTitle ?? null,
        homepageIntentDescription: category.homepageIntentDescription ?? null,
        homepageIntentSortOrder: category.homepageIntentSortOrder ?? 0,
        isFeatured: Boolean(category.isFeatured)
      },
      create: {
        tenantId,
        name: category.name,
        slug: category.slug,
        parentId: null,
        type: category.type,
        status: "ACTIVE",
        sortOrder: category.sortOrder,
        showOnHomepageIntent: Boolean(category.showOnHomepageIntent),
        homepageIntentTitle: category.homepageIntentTitle ?? null,
        homepageIntentDescription: category.homepageIntentDescription ?? null,
        homepageIntentSortOrder: category.homepageIntentSortOrder ?? 0,
        isFeatured: Boolean(category.isFeatured)
      },
      select: { id: true }
    });

    categoryBySlug.set(category.slug, savedCategory);
  }

  for (const category of categories.filter((item) => item.parentSlug)) {
    const parent = categoryBySlug.get(category.parentSlug ?? "");
    const savedCategory = await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: category.slug
        }
      },
      update: {
        name: category.name,
        parentId: parent?.id ?? null,
        type: category.type,
        status: "ACTIVE",
        sortOrder: category.sortOrder,
        showOnHomepageIntent: Boolean(category.showOnHomepageIntent),
        homepageIntentTitle: category.homepageIntentTitle ?? null,
        homepageIntentDescription: category.homepageIntentDescription ?? null,
        homepageIntentSortOrder: category.homepageIntentSortOrder ?? 0,
        isFeatured: Boolean(category.isFeatured)
      },
      create: {
        tenantId,
        name: category.name,
        slug: category.slug,
        parentId: parent?.id ?? null,
        type: category.type,
        status: "ACTIVE",
        sortOrder: category.sortOrder,
        showOnHomepageIntent: Boolean(category.showOnHomepageIntent),
        homepageIntentTitle: category.homepageIntentTitle ?? null,
        homepageIntentDescription: category.homepageIntentDescription ?? null,
        homepageIntentSortOrder: category.homepageIntentSortOrder ?? 0,
        isFeatured: Boolean(category.isFeatured)
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

    const variant = await prisma.productVariant.upsert({
      where: { sku: item.sku },
      update: {
        productId: product.id,
        title: item.variantTitle ?? "Default",
        attributesJson: item.variantAttributesJson ?? undefined,
        price: item.basePrice,
        mrp: item.mrp,
        active: true,
        stockStatus: "IN_STOCK"
      },
      create: {
        productId: product.id,
        sku: item.sku,
        title: item.variantTitle ?? "Default",
        attributesJson: item.variantAttributesJson ?? undefined,
        price: item.basePrice,
        mrp: item.mrp,
        active: true,
        stockStatus: "IN_STOCK"
      }
    });

    for (const extraVariant of item.extraVariants ?? []) {
      await prisma.productVariant.upsert({
        where: { sku: extraVariant.sku },
        update: {
          productId: product.id,
          title: extraVariant.title,
          attributesJson: extraVariant.attributesJson,
          price: extraVariant.price,
          mrp: extraVariant.mrp,
          active: true,
          stockStatus: "IN_STOCK"
        },
        create: {
          productId: product.id,
          sku: extraVariant.sku,
          title: extraVariant.title,
          attributesJson: extraVariant.attributesJson,
          price: extraVariant.price,
          mrp: extraVariant.mrp,
          active: true,
          stockStatus: "IN_STOCK"
        }
      });
    }

    if (item.type === "PHYSICAL") {
      const existingInitialMovement = await prisma.inventoryLedger.findFirst({
        where: {
          tenantId,
          variantId: variant.id,
          movementType: "initial"
        },
        select: { id: true }
      });

      if (!existingInitialMovement) {
        await prisma.inventoryLedger.create({
          data: {
            tenantId,
            productId: product.id,
            variantId: variant.id,
            movementType: "initial",
            quantity: 25,
            reason: "Seeded opening stock for Phase 3C inventory foundation."
          }
        });
      }
    }
  }

  const kit = await prisma.product.findUnique({
    where: { tenantId_slug: { tenantId, slug: "satvik-puja-samagri-kit" } },
    select: { id: true }
  });
  const componentSkus = [
    { sku: "OMD-GANGA-JAL", quantity: 2, sortOrder: 10 },
    { sku: "OMD-RB-THALI", quantity: 1, sortOrder: 20 },
    { sku: "OMD-RUD-MALA", quantity: 1, sortOrder: 30 }
  ];

  if (kit) {
    for (const component of componentSkus) {
      const variant = await prisma.productVariant.findUnique({
        where: { sku: component.sku },
        include: { product: { select: { id: true } } }
      });

      if (!variant) continue;

      const existing = await prisma.kitComponent.findFirst({
        where: {
          tenantId,
          kitProductId: kit.id,
          componentVariantId: variant.id
        },
        select: { id: true }
      });

      if (existing) {
        await prisma.kitComponent.update({
          where: { id: existing.id },
          data: {
            componentProductId: variant.product.id,
            quantity: component.quantity,
            sortOrder: component.sortOrder
          }
        });
      } else {
        await prisma.kitComponent.create({
          data: {
            tenantId,
            kitProductId: kit.id,
            componentProductId: variant.product.id,
            componentVariantId: variant.id,
            quantity: component.quantity,
            sortOrder: component.sortOrder
          }
        });
      }
    }
  }
}

async function seedProductExperience(tenantId: string, customerId: string) {
  const mediaBySlug: Record<string, Array<{ url: string; altText: string; isPrimary?: boolean; sortOrder: number }>> = {
    "rudraksha-mala": [
      { url: "https://images.unsplash.com/photo-1604881988758-f76ad2f7aac1?auto=format&fit=crop&w=1200&q=80", altText: "Rudraksha mala on a calm devotional surface", isPrimary: true, sortOrder: 10 },
      { url: "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=1200&q=80", altText: "Close detail of prayer beads", sortOrder: 20 }
    ],
    "satvik-puja-samagri-kit": [
      { url: "https://images.unsplash.com/photo-1604608672516-8e6c6ed88492?auto=format&fit=crop&w=1200&q=80", altText: "Puja samagri arranged for ritual", isPrimary: true, sortOrder: 10 },
      { url: "https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&w=1200&q=80", altText: "Temple offering plate and devotional items", sortOrder: 20 }
    ],
    "divya-membership": [
      { url: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80", altText: "Temple lamps for membership offering", isPrimary: true, sortOrder: 10 },
      { url: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=80", altText: "Devotional gathering atmosphere", sortOrder: 20 }
    ],
    "kundli-basic-report": [
      { url: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=1200&q=80", altText: "Astrology chart and notes", isPrimary: true, sortOrder: 10 },
      { url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", altText: "Printed report style preview", sortOrder: 20 }
    ],
    "asthi-visarjan-seva": [
      { url: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?auto=format&fit=crop&w=1200&q=80", altText: "Sacred river steps at sunrise", isPrimary: true, sortOrder: 10 },
      { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", altText: "Calm river landscape", sortOrder: 20 }
    ]
  };

  for (const [slug, mediaItems] of Object.entries(mediaBySlug)) {
    const product = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      select: { id: true }
    });

    if (!product) continue;

    for (const media of mediaItems) {
      const existing = await prisma.productMedia.findFirst({
        where: { tenantId, productId: product.id, url: media.url },
        select: { id: true }
      });

      if (media.isPrimary) {
        await prisma.productMedia.updateMany({ where: { tenantId, productId: product.id }, data: { isPrimary: false, role: "gallery" } });
      }

      if (existing) {
        await prisma.productMedia.update({
          where: { id: existing.id },
          data: { altText: media.altText, sortOrder: media.sortOrder, isPrimary: Boolean(media.isPrimary), role: media.isPrimary ? "primary" : "gallery" }
        });
      } else {
        await prisma.productMedia.create({
          data: {
            tenantId,
            productId: product.id,
            url: media.url,
            altText: media.altText,
            sortOrder: media.sortOrder,
            isPrimary: Boolean(media.isPrimary),
            role: media.isPrimary ? "primary" : "gallery"
          }
        });
      }
    }
  }

  const reviewSeeds = [
    { slug: "rudraksha-mala", rating: 5, title: "Beautiful quality", body: "The mala felt premium and the checkout flow was easy.", status: "approved" },
    { slug: "satvik-puja-samagri-kit", rating: 5, title: "Convenient kit", body: "Useful curated kit for a home puja setup.", status: "approved" },
    { slug: "divya-membership", rating: 4, title: "Thoughtful membership", body: "The monthly package options are clear.", status: "approved" },
    { slug: "kundli-basic-report", rating: 4, title: "Pending moderation sample", body: "This seeded review is intentionally pending for admin review.", status: "pending" }
  ];

  for (const review of reviewSeeds) {
    const product = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId, slug: review.slug } },
      select: { id: true }
    });

    if (!product) continue;

    const existing = await prisma.productReview.findFirst({
      where: { tenantId, productId: product.id, title: review.title },
      select: { id: true }
    });

    const data = {
      tenantId,
      productId: product.id,
      userId: customerId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      customerName: "Demo Customer",
      status: review.status,
      isVerifiedPurchase: false
    };

    if (existing) {
      await prisma.productReview.update({ where: { id: existing.id }, data });
    } else {
      await prisma.productReview.create({ data });
    }
  }
}

async function seedMerchandising(tenantId: string) {
  const productBySlug = new Map(
    (await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, slug: true, type: true }
    })).map((product) => [product.slug, product])
  );
  const categoryBySlug = new Map(
    (await prisma.category.findMany({
      where: { tenantId },
      select: { id: true, slug: true }
    })).map((category) => [category.slug, category])
  );

  const campaigns = [
    {
      title: "Sawan Shravan Devotional Collection",
      slug: "sawan-shravan-2026",
      shortDescription: "Rudrabhishek seva, puja samagri and sacred essentials curated for the Shravan period.",
      longDescription: "A focused seasonal campaign for devotees preparing for Shravan puja, Rudrabhishek, japa, and family worship. This is demo merchandising content controlled from the SaaS admin panel.",
      heroImage: "https://images.unsplash.com/photo-1604608672516-8e6c6ed88492?auto=format&fit=crop&w=1600&q=80",
      cardImage: "https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&w=1200&q=80",
      startDate: new Date("2026-06-01T00:00:00+05:30"),
      endDate: new Date("2026-08-15T23:59:59+05:30"),
      status: "ACTIVE",
      priority: 100,
      isFeatured: true,
      showOnHomepage: true,
      showInHero: true,
      showInAnnouncementStrip: true,
      ctaLabel: "Shop Shravan Picks",
      products: ["rudraksha-mala", "satvik-puja-samagri-kit", "ganga-jal-bottle"],
      services: ["rudrabhishek-puja-service"],
      categories: ["puja-samagri", "rudraksha-spiritual-items", "puja-services"]
    },
    {
      title: "Raksha Bandhan Puja Essentials",
      slug: "raksha-bandhan-2026",
      shortDescription: "Festival thali, samagri and family puja essentials for Raksha Bandhan.",
      longDescription: "A scheduled demo campaign for Raksha Bandhan seasonal merchandising.",
      heroImage: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1600&q=80",
      cardImage: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80",
      startDate: new Date("2026-08-01T00:00:00+05:30"),
      endDate: new Date("2026-09-05T23:59:59+05:30"),
      status: "SCHEDULED",
      priority: 80,
      isFeatured: true,
      showOnHomepage: true,
      showInHero: false,
      showInAnnouncementStrip: false,
      ctaLabel: "Prepare for Raksha Bandhan",
      products: ["raksha-bandhan-puja-thali", "ganga-jal-bottle", "satvik-puja-samagri-kit"],
      services: [],
      categories: ["festival-essentials", "puja-samagri"]
    },
    {
      title: "Shradh Pitru Paksha Seva Focus",
      slug: "shradh-pitru-paksha-2026",
      shortDescription: "Respectful seva support and guided offerings for Pitru Paksha remembrance.",
      longDescription: "A scheduled demo campaign connecting seva-oriented offerings and respectful ritual support.",
      heroImage: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?auto=format&fit=crop&w=1600&q=80",
      cardImage: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
      startDate: new Date("2026-09-05T00:00:00+05:30"),
      endDate: new Date("2026-09-25T23:59:59+05:30"),
      status: "SCHEDULED",
      priority: 70,
      isFeatured: false,
      showOnHomepage: true,
      showInHero: false,
      showInAnnouncementStrip: false,
      ctaLabel: "View Seva Support",
      products: ["ganga-jal-bottle"],
      services: ["asthi-visarjan-seva"],
      categories: ["asthi-visarjan", "puja-services"]
    },
    {
      title: "Diwali Puja and Gifting Collection",
      slug: "diwali-2026",
      shortDescription: "Curated puja samagri, kits, and devotional gifts for Diwali preparation.",
      longDescription: "A scheduled demo campaign for Diwali merchandising and gifting-oriented storefront sections.",
      heroImage: "https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&w=1600&q=80",
      cardImage: "https://images.unsplash.com/photo-1604608672516-8e6c6ed88492?auto=format&fit=crop&w=1200&q=80",
      startDate: new Date("2026-10-15T00:00:00+05:30"),
      endDate: new Date("2026-11-20T23:59:59+05:30"),
      status: "SCHEDULED",
      priority: 60,
      isFeatured: true,
      showOnHomepage: true,
      showInHero: false,
      showInAnnouncementStrip: false,
      ctaLabel: "Explore Diwali Picks",
      products: ["satvik-puja-samagri-kit", "rudraksha-mala", "ganga-jal-bottle"],
      services: ["rudrabhishek-puja-service"],
      categories: ["festival-essentials", "puja-samagri"]
    }
  ];

  for (const campaignSeed of campaigns) {
    const campaign = await prisma.festivalCampaign.upsert({
      where: { tenantId_slug: { tenantId, slug: campaignSeed.slug } },
      update: {
        title: campaignSeed.title,
        shortDescription: campaignSeed.shortDescription,
        longDescription: campaignSeed.longDescription,
        heroImage: campaignSeed.heroImage,
        cardImage: campaignSeed.cardImage,
        startDate: campaignSeed.startDate,
        endDate: campaignSeed.endDate,
        status: campaignSeed.status,
        priority: campaignSeed.priority,
        isFeatured: campaignSeed.isFeatured,
        showOnHomepage: campaignSeed.showOnHomepage,
        showInHero: campaignSeed.showInHero,
        showInAnnouncementStrip: campaignSeed.showInAnnouncementStrip,
        ctaLabel: campaignSeed.ctaLabel,
        ctaUrl: `/festivals/${campaignSeed.slug}`,
        seoTitle: campaignSeed.title,
        seoDescription: campaignSeed.shortDescription
      },
      create: {
        tenantId,
        title: campaignSeed.title,
        slug: campaignSeed.slug,
        shortDescription: campaignSeed.shortDescription,
        longDescription: campaignSeed.longDescription,
        heroImage: campaignSeed.heroImage,
        cardImage: campaignSeed.cardImage,
        startDate: campaignSeed.startDate,
        endDate: campaignSeed.endDate,
        status: campaignSeed.status,
        priority: campaignSeed.priority,
        isFeatured: campaignSeed.isFeatured,
        showOnHomepage: campaignSeed.showOnHomepage,
        showInHero: campaignSeed.showInHero,
        showInAnnouncementStrip: campaignSeed.showInAnnouncementStrip,
        ctaLabel: campaignSeed.ctaLabel,
        ctaUrl: `/festivals/${campaignSeed.slug}`,
        seoTitle: campaignSeed.title,
        seoDescription: campaignSeed.shortDescription
      }
    });

    await prisma.festivalCampaignProduct.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.festivalCampaignService.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.festivalCampaignCategory.deleteMany({ where: { campaignId: campaign.id } });

    const productLinks = campaignSeed.products
      .map((slug, index) => {
        const product = productBySlug.get(slug);
        return product ? { tenantId, campaignId: campaign.id, productId: product.id, sortOrder: (index + 1) * 10, isFeatured: index < 4 } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const serviceLinks = campaignSeed.services
      .map((slug, index) => {
        const service = productBySlug.get(slug);
        return service ? { tenantId, campaignId: campaign.id, serviceId: service.id, sortOrder: (index + 1) * 10, isFeatured: true } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const categoryLinks = campaignSeed.categories
      .map((slug, index) => {
        const category = categoryBySlug.get(slug);
        return category ? { tenantId, campaignId: campaign.id, categoryId: category.id, sortOrder: (index + 1) * 10, isFeatured: index === 0 } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (productLinks.length) await prisma.festivalCampaignProduct.createMany({ data: productLinks });
    if (serviceLinks.length) await prisma.festivalCampaignService.createMany({ data: serviceLinks });
    if (categoryLinks.length) await prisma.festivalCampaignCategory.createMany({ data: categoryLinks });
  }

  const product = productBySlug.get("satvik-puja-samagri-kit");
  const membership = productBySlug.get("divya-membership");

  const placements = [
    {
      placementKey: "homepage_hero",
      surface: "HOMEPAGE",
      targetType: "FESTIVAL",
      targetId: "sawan-shravan-2026",
      title: "Shravan Puja Essentials and Seva",
      description: "Rudrabhishek support, sacred samagri and spiritual items curated for the Shravan period.",
      image: "https://images.unsplash.com/photo-1604608672516-8e6c6ed88492?auto=format&fit=crop&w=1600&q=80",
      ctaLabel: "Shop Shravan Picks",
      ctaUrl: "/festivals/sawan-shravan-2026",
      priority: 100,
      sortOrder: 10,
      status: "ACTIVE"
    },
    {
      placementKey: "top_announcement_strip",
      surface: "GLOBAL",
      targetType: "FESTIVAL",
      targetId: "sawan-shravan-2026",
      title: "Shravan campaign is active",
      description: "Explore seasonal puja essentials and mock-checkout the full customer journey.",
      ctaLabel: "View Campaign",
      ctaUrl: "/festivals/sawan-shravan-2026",
      priority: 90,
      sortOrder: 10,
      status: "ACTIVE"
    },
    {
      placementKey: "shop_top_banner",
      surface: "SHOP",
      targetType: "KIT",
      targetId: product?.id ?? null,
      title: "Complete Puja Kit Highlight",
      description: "Promote the Satvik Puja Samagri Kit with component inventory and mock payment flow.",
      ctaLabel: "View Kit",
      ctaUrl: "/product/satvik-puja-samagri-kit",
      priority: 80,
      sortOrder: 10,
      status: "ACTIVE"
    },
    {
      placementKey: "homepage_featured_products",
      surface: "HOMEPAGE",
      targetType: "KIT",
      targetId: product?.id ?? null,
      title: "Feature Satvik Puja Samagri Kit",
      priority: 70,
      sortOrder: 10,
      status: "ACTIVE"
    },
    {
      placementKey: "dashboard_seasonal_card",
      surface: "DASHBOARD",
      targetType: "MEMBERSHIP",
      targetId: membership?.id ?? null,
      title: "Divya Membership Monthly Plans",
      description: "Dashboard seasonal card placeholder for membership merchandising.",
      ctaLabel: "View Membership",
      ctaUrl: "/membership",
      priority: 40,
      sortOrder: 10,
      status: "ACTIVE"
    },
    {
      placementKey: "cart_cross_sell",
      surface: "CHECKOUT",
      targetType: "PRODUCT",
      targetId: productBySlug.get("ganga-jal-bottle")?.id ?? null,
      title: "Add Ganga Jal to your puja order",
      priority: 30,
      sortOrder: 10,
      status: "ACTIVE"
    },
    {
      placementKey: "checkout_last_suggestion",
      surface: "CHECKOUT",
      targetType: "MEMBERSHIP",
      targetId: membership?.id ?? null,
      title: "Consider Divya Membership",
      priority: 20,
      sortOrder: 10,
      status: "ACTIVE"
    }
  ];

  for (const placementSeed of placements) {
    const existing = await prisma.promotionPlacement.findFirst({
      where: {
        tenantId,
        placementKey: placementSeed.placementKey,
        title: placementSeed.title
      },
      select: { id: true }
    });

    const data = {
      tenantId,
      placementKey: placementSeed.placementKey,
      surface: placementSeed.surface,
      targetType: placementSeed.targetType,
      targetId: placementSeed.targetId,
      title: placementSeed.title,
      description: placementSeed.description ?? null,
      image: placementSeed.image ?? null,
      ctaLabel: placementSeed.ctaLabel ?? null,
      ctaUrl: placementSeed.ctaUrl ?? null,
      startDate: new Date("2026-06-01T00:00:00+05:30"),
      endDate: new Date("2026-08-15T23:59:59+05:30"),
      priority: placementSeed.priority,
      status: placementSeed.status,
      sortOrder: placementSeed.sortOrder
    };

    if (existing) {
      await prisma.promotionPlacement.update({ where: { id: existing.id }, data });
    } else {
      await prisma.promotionPlacement.create({ data });
    }
  }
}

async function seedPremiumCommerce(tenantId: string) {
  const products = new Map(
    (await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, slug: true, type: true, categoryId: true }
    })).map((product) => [product.slug, product])
  );
  const categories = new Map(
    (await prisma.category.findMany({
      where: { tenantId },
      select: { id: true, slug: true }
    })).map((category) => [category.slug, category])
  );

  const detailSeeds = [
    {
      slug: "satvik-puja-samagri-kit",
      specs: [
        ["Pack Type", "Curated box pack"],
        ["Shelf Life", "6 months for applicable items"],
        ["Country of Origin", "India"],
        ["Ritual Use", "Daily puja, vrat and festival worship"]
      ],
      blocks: [
        {
          title: "What's Inside",
          body: "A ready-to-use samagri selection for common household puja needs.",
          items: ["Sacred water bottle", "Festival thali component", "Rudraksha mala component"]
        },
        {
          title: "How to Use",
          body: "Prepare the puja space, arrange the kit items, and use according to family tradition or priest guidance.",
          items: ["Open and verify all components", "Keep sacred items clean and dry", "Use with guided ritual support when needed"]
        }
      ],
      faqs: [
        ["Can I buy this kit as one item?", "Yes. The kit is sold as a single product while component stock is tracked behind the scenes."],
        ["Does kit inventory reserve components?", "Yes. Mock checkout reserves component inventory for the kit."]
      ]
    },
    {
      slug: "ganga-jal-bottle",
      specs: [
        ["Pack Type", "Bottle"],
        ["Volume", "Demo 250 ml"],
        ["Origin", "Sacred water placeholder"],
        ["Ritual Use", "Puja, purification and home rituals"]
      ],
      blocks: [
        {
          title: "Ritual Notes",
          body: "Use respectfully during home puja, kalash preparation, or devotional cleansing rituals.",
          items: ["Store in a clean place", "Use only for devotional purposes"]
        }
      ],
      faqs: [["Is this stock tracked?", "Yes. This demo product has physical inventory for cart and checkout testing."]]
    },
    {
      slug: "rudraksha-mala",
      specs: [
        ["Material", "Rudraksha beads"],
        ["Use", "Japa and meditation"],
        ["Care", "Keep dry and store safely"],
        ["Origin", "India"]
      ],
      blocks: [
        {
          title: "Care Instructions",
          body: "Keep the mala in a clean pouch and avoid chemical exposure.",
          items: ["Use with clean hands", "Avoid moisture", "Store separately after use"]
        }
      ],
      faqs: [["Can I use this for daily japa?", "Yes, it is positioned for daily devotional use in this demo catalog."]]
    },
    {
      slug: "divya-membership",
      specs: [
        ["Billing Cadence", "Monthly"],
        ["Activation", "After successful mock payment"],
        ["Renewal Automation", "Deferred"],
        ["Wallet Benefit", "Cashback promise only, no ledger credit"]
      ],
      blocks: [
        {
          title: "Membership Offering",
          body: "Monthly membership variants support ongoing devotional participation and future member-specific benefits.",
          items: ["Nitya Seva Monthly", "Puja Sahyog Monthly", "Kutumb Seva Monthly"]
        }
      ],
      faqs: [["Is this lifetime membership?", "No. Seeded plans are monthly only."]]
    },
    {
      slug: "kundli-basic-report",
      specs: [
        ["Delivery", "Digital or printed variant"],
        ["Report Type", "Basic kundli report"],
        ["Fulfilment", "Manual/demo placeholder"],
        ["Privacy", "Production privacy workflow deferred"]
      ],
      blocks: [
        {
          title: "What You Receive",
          body: "A purchase-ready digital report product with a printed variant option for future fulfilment.",
          items: ["Digital report variant", "Printed report variant"]
        }
      ],
      faqs: [["Is report generation automated?", "No. Report generation and delivery automation are deferred."]]
    }
  ];

  for (const seed of detailSeeds) {
    const product = products.get(seed.slug);
    if (!product) continue;

    for (const [index, spec] of seed.specs.entries()) {
      const [label, value] = spec;
      const existing = await prisma.productSpec.findFirst({ where: { tenantId, productId: product.id, label }, select: { id: true } });
      const data = { tenantId, productId: product.id, label, value, groupName: "Details", sortOrder: (index + 1) * 10 };
      if (existing) await prisma.productSpec.update({ where: { id: existing.id }, data });
      else await prisma.productSpec.create({ data });
    }

    for (const [index, block] of seed.blocks.entries()) {
      const existing = await prisma.productContentBlock.findFirst({ where: { tenantId, productId: product.id, title: block.title }, select: { id: true } });
      const data = {
        tenantId,
        productId: product.id,
        blockType: "DETAIL",
        title: block.title,
        body: block.body,
        itemsJson: block.items,
        status: "ACTIVE",
        sortOrder: (index + 1) * 10
      };
      if (existing) await prisma.productContentBlock.update({ where: { id: existing.id }, data });
      else await prisma.productContentBlock.create({ data });
    }

    for (const [index, faq] of seed.faqs.entries()) {
      const [question, answer] = faq;
      const existing = await prisma.productFaq.findFirst({ where: { tenantId, productId: product.id, question }, select: { id: true } });
      const data = { tenantId, productId: product.id, question, answer, status: "ACTIVE", sortOrder: (index + 1) * 10 };
      if (existing) await prisma.productFaq.update({ where: { id: existing.id }, data });
      else await prisma.productFaq.create({ data });
    }
  }

  const deliveryZones = [
    { pincode: "221001", city: "Varanasi", state: "Uttar Pradesh", serviceable: true, estimatedDays: 2, shippingCharge: 0, codAvailable: false },
    { pincode: "110001", city: "New Delhi", state: "Delhi", serviceable: true, estimatedDays: 4, shippingCharge: 79, codAvailable: false },
    { pincode: "400001", city: "Mumbai", state: "Maharashtra", serviceable: true, estimatedDays: 5, shippingCharge: 99, codAvailable: false },
    { pincode: "999999", city: "Demo City", state: "Demo State", serviceable: false, estimatedDays: null, shippingCharge: 0, codAvailable: false }
  ];

  for (const zone of deliveryZones) {
    await prisma.serviceablePincode.upsert({
      where: { tenantId_pincode: { tenantId, pincode: zone.pincode } },
      update: zone,
      create: { tenantId, ...zone }
    });
  }

  const offerSeeds = [
    {
      title: "Puja Samagri Automatic 10% Off",
      code: null,
      ruleType: "AUTOMATIC",
      status: "ACTIVE",
      priority: 90,
      targetType: "CATEGORY",
      targetIds: ["puja-samagri", "puja-kits", "sacred-waters", "puja-thali"]
        .map((slug) => categories.get(slug)?.id)
        .filter((id): id is string => Boolean(id)),
      discountKind: "PERCENT",
      discountValue: 10,
      maxDiscountAmount: 300,
      minCartValue: 0,
      cashbackKind: null,
      cashbackValue: null,
      stackWithAutomatic: true
    },
    {
      title: "OMD100 Flat Coupon",
      code: "OMD100",
      ruleType: "COUPON",
      status: "ACTIVE",
      priority: 100,
      targetType: "PRODUCT",
      targetIds: [],
      discountKind: "FLAT",
      discountValue: 100,
      maxDiscountAmount: null,
      minCartValue: 499,
      cashbackKind: null,
      cashbackValue: null,
      stackWithAutomatic: true
    },
    {
      title: "Membership Cashback Promise",
      code: null,
      ruleType: "AUTOMATIC",
      status: "ACTIVE",
      priority: 70,
      targetType: "MEMBERSHIP",
      targetIds: [products.get("divya-membership")?.id].filter((id): id is string => Boolean(id)),
      discountKind: "FLAT",
      discountValue: 0,
      maxDiscountAmount: null,
      minCartValue: 0,
      cashbackKind: "PERCENT",
      cashbackValue: 5,
      stackWithAutomatic: true
    },
    {
      title: "Festival Kit Offer",
      code: null,
      ruleType: "AUTOMATIC",
      status: "ACTIVE",
      priority: 80,
      targetType: "KIT",
      targetIds: [products.get("satvik-puja-samagri-kit")?.id].filter((id): id is string => Boolean(id)),
      discountKind: "PERCENT",
      discountValue: 7,
      maxDiscountAmount: 150,
      minCartValue: 0,
      cashbackKind: null,
      cashbackValue: null,
      stackWithAutomatic: true
    }
  ];

  for (const seed of offerSeeds) {
    const existing = await prisma.offerRule.findFirst({ where: { tenantId, title: seed.title }, select: { id: true } });
    const targetScope = seed.targetIds.length ? "TARGETED" : "ALL";
    const data = {
      tenantId,
      title: seed.title,
      code: seed.code,
      ruleType: seed.ruleType,
      status: seed.status,
      priority: seed.priority,
      startDate: new Date("2026-06-01T00:00:00+05:30"),
      endDate: new Date("2026-12-31T23:59:59+05:30"),
      targetScope,
      discountKind: seed.discountKind,
      discountValue: seed.discountValue,
      minCartValue: seed.minCartValue,
      maxDiscountAmount: seed.maxDiscountAmount,
      cashbackKind: seed.cashbackKind,
      cashbackValue: seed.cashbackValue,
      usageLimit: null,
      perUserLimit: null,
      stackWithAutomatic: seed.stackWithAutomatic,
      stackWithCoupon: false
    };
    const offer = existing ? await prisma.offerRule.update({ where: { id: existing.id }, data }) : await prisma.offerRule.create({ data });

    await prisma.offerTarget.deleteMany({ where: { offerRuleId: offer.id } });
    if (targetScope === "TARGETED") {
      await prisma.offerTarget.createMany({
        data: seed.targetIds.map((targetId) => ({ tenantId, offerRuleId: offer.id, targetType: seed.targetType, targetId }))
      });
    }
  }
}

async function seedKundliModule(tenantId: string) {
  const packages: Array<{
    name: string;
    slug: string;
    description: string;
    deliveryMode: KundliDeliveryMode;
    price: number;
    estimatedDeliveryDays: number;
    inclusionsJson: string[];
    sortOrder: number;
  }> = [
    {
      name: "Online Kundli Report",
      slug: "online-kundli-report",
      description: "A concise digital Kundli report prepared from birth details and delivered as a report placeholder.",
      deliveryMode: "DIGITAL_REPORT",
      price: 499,
      estimatedDeliveryDays: 3,
      inclusionsJson: ["Digital Kundli report", "Basic graha and house summary", "Customer timeline tracking"],
      sortOrder: 10
    },
    {
      name: "Handmade Kundli",
      slug: "handmade-kundli",
      description: "Traditional handmade Kundli preparation with operations tracking and report upload placeholder.",
      deliveryMode: "HANDMADE_REPORT",
      price: 1501,
      estimatedDeliveryDays: 7,
      inclusionsJson: ["Handmade report preparation", "Birth detail verification", "Digital proof placeholder"],
      sortOrder: 20
    },
    {
      name: "Detailed Life Report",
      slug: "detailed-life-report",
      description: "A deeper digital report for life themes, career, family and spiritual guidance placeholders.",
      deliveryMode: "DIGITAL_REPORT",
      price: 2501,
      estimatedDeliveryDays: 5,
      inclusionsJson: ["Detailed report", "Question-focused analysis", "Language preference capture"],
      sortOrder: 30
    },
    {
      name: "Kundli Matching",
      slug: "kundli-matching",
      description: "Matchmaking intake for two birth profiles with compatibility report delivery placeholder.",
      deliveryMode: "MATCHMAKING",
      price: 3100,
      estimatedDeliveryDays: 5,
      inclusionsJson: ["Two-profile intake", "Compatibility summary", "Matching report placeholder"],
      sortOrder: 40
    },
    {
      name: "Consultation + Report",
      slug: "consultation-report",
      description: "Report preparation followed by a consultation scheduling placeholder handled by operations.",
      deliveryMode: "REPORT_AND_CONSULTATION",
      price: 5100,
      estimatedDeliveryDays: 7,
      inclusionsJson: ["Detailed report", "Consultation scheduling placeholder", "Admin assignment tracking"],
      sortOrder: 50
    }
  ];

  for (const item of packages) {
    await prisma.kundliPackage.upsert({
      where: { tenantId_slug: { tenantId, slug: item.slug } },
      update: {
        name: item.name,
        description: item.description,
        deliveryMode: item.deliveryMode,
        price: item.price,
        currency: "INR",
        estimatedDeliveryDays: item.estimatedDeliveryDays,
        inclusionsJson: item.inclusionsJson,
        status: "ACTIVE",
        sortOrder: item.sortOrder
      },
      create: {
        tenantId,
        name: item.name,
        slug: item.slug,
        description: item.description,
        deliveryMode: item.deliveryMode,
        price: item.price,
        currency: "INR",
        estimatedDeliveryDays: item.estimatedDeliveryDays,
        inclusionsJson: item.inclusionsJson,
        status: "ACTIVE",
        sortOrder: item.sortOrder
      }
    });
  }
}

async function seedAsthiModule(tenantId: string) {
  const locations = [
    {
      name: "Kashi Asthi Visarjan",
      slug: "kashi",
      city: "Varanasi",
      state: "Uttar Pradesh",
      description: "Guided seva coordination around the sacred ghats of Kashi.",
      sortOrder: 10
    },
    {
      name: "Haridwar Asthi Visarjan",
      slug: "haridwar",
      city: "Haridwar",
      state: "Uttarakhand",
      description: "Assisted ritual flow for families choosing Haridwar.",
      sortOrder: 20
    },
    {
      name: "Prayagraj Asthi Visarjan",
      slug: "prayagraj",
      city: "Prayagraj",
      state: "Uttar Pradesh",
      description: "Sangam-focused assistance for Asthi Visarjan requests.",
      sortOrder: 30
    },
    {
      name: "Gaya Pitru Seva",
      slug: "gaya",
      city: "Gaya",
      state: "Bihar",
      description: "Pitru ritual assistance placeholder for future coordination.",
      sortOrder: 40
    }
  ];

  for (const location of locations) {
    await prisma.asthiLocation.upsert({
      where: { tenantId_slug: { tenantId, slug: location.slug } },
      update: { ...location, active: true },
      create: { tenantId, ...location, active: true }
    });
  }

  const packages = [
    {
      name: "Essential Seva",
      slug: "essential-seva",
      description: "A simple guided Asthi Visarjan assistance package for local family coordination.",
      price: 4100,
      inclusionsJson: ["Location coordination", "Basic ritual guidance", "Customer tracking updates"],
      sortOrder: 10
    },
    {
      name: "Complete Seva",
      slug: "complete-seva",
      description: "A fuller assistance package with document review, scheduling, proof placeholder and certificate note.",
      price: 7100,
      inclusionsJson: ["Document review", "Ritual scheduling placeholder", "Proof upload placeholder", "Certificate note"],
      sortOrder: 20
    },
    {
      name: "NRI / Global Seva",
      slug: "nri-global-seva",
      description: "Remote-assisted package for families outside India with extended coordination notes.",
      price: 11100,
      inclusionsJson: ["Remote family coordination", "International applicant support placeholder", "Detailed timeline updates"],
      sortOrder: 30
    }
  ];

  for (const item of packages) {
    await prisma.asthiPackage.upsert({
      where: { tenantId_slug: { tenantId, slug: item.slug } },
      update: { ...item, currency: "INR", active: true },
      create: { tenantId, ...item, currency: "INR", active: true }
    });
  }

  const addOns = [
    {
      name: "Tarpan Seva Add-on",
      slug: "tarpan-seva",
      description: "Additional tarpan ritual coordination placeholder.",
      price: 1100,
      sortOrder: 10
    },
    {
      name: "Pind Daan Add-on",
      slug: "pind-daan",
      description: "Pind Daan assistance placeholder for eligible locations.",
      price: 2100,
      sortOrder: 20
    },
    {
      name: "Prasad Dispatch Placeholder",
      slug: "prasad-dispatch",
      description: "Internal note and dispatch placeholder only. No courier API.",
      price: 501,
      sortOrder: 30
    },
    {
      name: "Ritual Certificate Note",
      slug: "ritual-certificate-note",
      description: "Admin certificate note placeholder after completion.",
      price: 251,
      sortOrder: 40
    }
  ];

  for (const addOn of addOns) {
    await prisma.asthiAddOn.upsert({
      where: { tenantId_slug: { tenantId, slug: addOn.slug } },
      update: { ...addOn, active: true },
      create: { tenantId, ...addOn, active: true }
    });
  }
}

async function seedServiceOperationsFoundation(tenantId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const sawanSlot = new Date(tomorrow);
  sawanSlot.setDate(sawanSlot.getDate() + 7);

  const slotSeeds = [
    {
      serviceType: "ASTHI",
      title: "Asthi Visarjan Haridwar Daily Capacity",
      date: tomorrow,
      startTime: "07:00",
      endTime: "12:00",
      capacityTotal: 12,
      notes: "Demo daily Asthi operations capacity for Haridwar."
    },
    {
      serviceType: "ASTHI",
      title: "Asthi Visarjan Kashi Daily Capacity",
      date: dayAfter,
      startTime: "06:30",
      endTime: "11:30",
      capacityTotal: 10,
      notes: "Demo daily Asthi operations capacity for Kashi."
    },
    {
      serviceType: "PUJA",
      title: "Rudrabhishek Puja Sawan Slot",
      date: sawanSlot,
      startTime: "08:00",
      endTime: "10:00",
      capacityTotal: 8,
      notes: "Sample Sawan puja capacity shell. No external calendar is connected."
    },
    {
      serviceType: "KUNDLI",
      title: "Kundli Consultation / Report Workload",
      date: dayAfter,
      startTime: "14:00",
      endTime: "18:00",
      capacityTotal: 15,
      notes: "Demo astrologer workload capacity for reports and consultations."
    }
  ];

  for (const seed of slotSeeds) {
    const existing = await prisma.serviceCapacitySlot.findFirst({
      where: { tenantId, serviceType: seed.serviceType, title: seed.title, date: seed.date },
      select: { id: true }
    });
    const data = { tenantId, status: "ACTIVE", ...seed };
    if (existing) await prisma.serviceCapacitySlot.update({ where: { id: existing.id }, data });
    else await prisma.serviceCapacitySlot.create({ data });
  }

  const rudrabhishek = await prisma.product.findUnique({
    where: { tenantId_slug: { tenantId, slug: "rudrabhishek-puja-service" } },
    include: { variants: { where: { active: true }, take: 1 } }
  });

  if (rudrabhishek) {
    const ruleSeeds = [
      {
        serviceId: rudrabhishek.id,
        variantId: rudrabhishek.variants[0]?.id ?? null,
        locationText: "Kashi",
        dailyLimit: 5,
        weeklyLimit: 24,
        monthlyLimit: 80,
        totalLimit: null,
        manualReviewFallback: true,
        active: true,
        notes: "Demo Rudrabhishek daily/weekly/monthly limits. Excess bookings join the queue."
      },
      {
        serviceId: rudrabhishek.id,
        variantId: null,
        locationText: null,
        dailyLimit: 12,
        weeklyLimit: 60,
        monthlyLimit: 180,
        totalLimit: null,
        manualReviewFallback: true,
        active: true,
        notes: "General Rudrabhishek fallback capacity rule for demo bookings."
      }
    ];

    for (const seed of ruleSeeds) {
      const existing = await prisma.serviceCapacityRule.findFirst({
        where: { tenantId, serviceId: seed.serviceId, variantId: seed.variantId, locationText: seed.locationText },
        select: { id: true }
      });
      const data = { tenantId, ...seed };
      if (existing) await prisma.serviceCapacityRule.update({ where: { id: existing.id }, data });
      else await prisma.serviceCapacityRule.create({ data });
    }
  }
}

async function upsertOperationalDocument(seed: {
  tenantId: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  title: string;
  description?: string;
  status?: string;
  visibility?: string;
  fileName?: string;
  fileUrl?: string;
  storageKey?: string;
  mimeType?: string;
}) {
  const existing = await prisma.operationalDocument.findFirst({
    where: {
      tenantId: seed.tenantId,
      ownerType: seed.ownerType,
      ownerId: seed.ownerId,
      documentType: seed.documentType,
      title: seed.title
    },
    select: { id: true }
  });

  const data = {
    tenantId: seed.tenantId,
    ownerType: seed.ownerType,
    ownerId: seed.ownerId,
    documentType: seed.documentType,
    title: seed.title,
    description: seed.description ?? null,
    status: seed.status ?? "REQUESTED",
    visibility: seed.visibility ?? "INTERNAL_ONLY",
    fileName: seed.fileName ?? null,
    fileUrl: seed.fileUrl ?? null,
    storageKey: seed.storageKey ?? null,
    mimeType: seed.mimeType ?? null
  };

  const document = existing
    ? await prisma.operationalDocument.update({ where: { id: existing.id }, data })
    : await prisma.operationalDocument.create({ data });

  const activity = await prisma.documentActivity.findFirst({
    where: { tenantId: seed.tenantId, documentId: document.id, action: data.status },
    select: { id: true }
  });

  if (!activity) {
    await prisma.documentActivity.create({
      data: {
        tenantId: seed.tenantId,
        documentId: document.id,
        action: data.status,
        note: "Seeded demo document shell placeholder."
      }
    });
  }
}

async function seedOperationalDocumentShell(tenantId: string) {
  const asthiApplication = await prisma.asthiApplication.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (asthiApplication) {
    await upsertOperationalDocument({
      tenantId,
      ownerType: "ASTHI_APPLICATION",
      ownerId: asthiApplication.id,
      documentType: "DEATH_CERTIFICATE",
      title: "Death Certificate",
      description: "Requested customer document placeholder. File storage will be connected later."
    });
    await upsertOperationalDocument({
      tenantId,
      ownerType: "ASTHI_APPLICATION",
      ownerId: asthiApplication.id,
      documentType: "ID_PROOF",
      title: "Applicant ID Proof",
      description: "Requested applicant identity proof placeholder."
    });
    await upsertOperationalDocument({
      tenantId,
      ownerType: "ASTHI_APPLICATION",
      ownerId: asthiApplication.id,
      documentType: "RELATION_PROOF",
      title: "Relation Proof",
      description: "Requested relation proof placeholder for operations review."
    });
    await upsertOperationalDocument({
      tenantId,
      ownerType: "ASTHI_APPLICATION",
      ownerId: asthiApplication.id,
      documentType: "RITUAL_PROOF",
      title: "Asthi Ritual Proof Placeholder",
      description: "Customer-visible proof placeholder. No real storage or certificate generation is connected.",
      status: "UPLOADED",
      visibility: "CUSTOMER_VISIBLE",
      fileName: "asthi-ritual-proof-placeholder.pdf",
      fileUrl: "https://example.com/omd/placeholders/asthi-ritual-proof-placeholder.pdf",
      mimeType: "application/pdf"
    });
  }

  const kundliOrder = await prisma.kundliOrder.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (kundliOrder) {
    await upsertOperationalDocument({
      tenantId,
      ownerType: "KUNDLI_ORDER",
      ownerId: kundliOrder.id,
      documentType: "KUNDLI_REPORT",
      title: "Kundli Report Placeholder",
      description: "Customer-visible final report placeholder. Real report generation is deferred.",
      status: "UPLOADED",
      visibility: "CUSTOMER_VISIBLE",
      fileName: "kundli-report-placeholder.pdf",
      fileUrl: "https://example.com/omd/placeholders/kundli-report-placeholder.pdf",
      mimeType: "application/pdf"
    });
  }

  const order = await prisma.order.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (order) {
    await upsertOperationalDocument({
      tenantId,
      ownerType: "ORDER",
      ownerId: order.id,
      documentType: "PRASAD_DISPATCH_PROOF",
      title: "Fulfilment Proof Placeholder",
      description: "Customer-visible fulfilment proof placeholder. No courier or file storage integration is connected.",
      status: "UPLOADED",
      visibility: "CUSTOMER_VISIBLE",
      fileName: "fulfilment-proof-placeholder.pdf",
      fileUrl: "https://example.com/omd/placeholders/fulfilment-proof-placeholder.pdf",
      mimeType: "application/pdf"
    });
  }
}

async function seedCustomerEventTracking(tenantId: string, customerId: string) {
  const existing = await prisma.customerEvent.findFirst({
    where: {
      tenantId,
      userId: customerId,
      metadataJson: { path: ["seeded"], equals: true }
    },
    select: { id: true }
  });

  if (existing) return;

  const [rudraksha, gangaJal, kit, pujaCategory, shivTag, pujaTag] = await Promise.all([
    prisma.product.findFirst({ where: { tenantId, slug: "rudraksha-mala" }, select: { id: true, title: true, slug: true, type: true, categoryId: true, category: { select: { name: true } } } }),
    prisma.product.findFirst({ where: { tenantId, slug: "ganga-jal-bottle" }, select: { id: true, title: true, slug: true, type: true, categoryId: true, category: { select: { name: true } } } }),
    prisma.product.findFirst({ where: { tenantId, slug: "satvik-puja-samagri-kit" }, select: { id: true, title: true, slug: true, type: true, categoryId: true, category: { select: { name: true } } } }),
    prisma.category.findFirst({ where: { tenantId, slug: "puja-samagri" }, select: { id: true, name: true, slug: true } }),
    prisma.tag.findFirst({ where: { tenantId, slug: "shiv" }, select: { id: true, name: true, slug: true, type: true } }),
    prisma.tag.findFirst({ where: { tenantId, slug: "puja-samagri" }, select: { id: true, name: true, slug: true, type: true } })
  ]);

  const tags = [shivTag, pujaTag].filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));
  const productMetadata = (product: NonNullable<typeof rudraksha>) => ({
    seeded: true,
    title: product.title,
    productType: product.type,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    tags
  });

  const events: Array<{
    eventType: string;
    entityType: string;
    entityId: string | null;
    entitySlug: string;
    sourcePath: string;
    metadataJson: object;
  }> = [
    rudraksha
      ? { eventType: "PRODUCT_VIEW", entityType: "PRODUCT", entityId: rudraksha.id, entitySlug: rudraksha.slug, sourcePath: `/product/${rudraksha.slug}`, metadataJson: productMetadata(rudraksha) }
      : null,
    gangaJal
      ? { eventType: "PRODUCT_VIEW", entityType: "PRODUCT", entityId: gangaJal.id, entitySlug: gangaJal.slug, sourcePath: `/product/${gangaJal.slug}`, metadataJson: productMetadata(gangaJal) }
      : null,
    kit
      ? { eventType: "ADD_TO_CART", entityType: "PRODUCT", entityId: kit.id, entitySlug: kit.slug, sourcePath: `/product/${kit.slug}`, metadataJson: { ...productMetadata(kit), quantity: 1 } }
      : null,
    pujaCategory
      ? { eventType: "CATEGORY_VIEW", entityType: "CATEGORY", entityId: pujaCategory.id, entitySlug: pujaCategory.slug, sourcePath: `/shop/category/${pujaCategory.slug}`, metadataJson: { seeded: true, title: pujaCategory.name, categoryId: pujaCategory.id, categoryName: pujaCategory.name, tags } }
      : null,
    { eventType: "SEARCH", entityType: "SEARCH_QUERY", entityId: null, entitySlug: "rudraksha", sourcePath: "/search?q=rudraksha", metadataJson: { seeded: true, query: "rudraksha", resultCount: 1, tags } }
  ].filter((event): event is NonNullable<typeof event> => Boolean(event));

  for (const event of events) {
    await prisma.customerEvent.create({
      data: {
        tenantId,
        userId: customerId,
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        entitySlug: event.entitySlug,
        sourcePath: event.sourcePath,
        metadataJson: event.metadataJson
      }
    });
  }

  await prisma.customerInterestProfile.upsert({
    where: { tenantId_userId: { tenantId, userId: customerId } },
    update: {
      topTagsJson: tags.map((tag, index) => ({ id: tag.id, label: tag.name, count: 4 - index })),
      topCategoriesJson: pujaCategory ? [{ id: pujaCategory.id, label: pujaCategory.name, count: 2 }] : [],
      topProductsJson: [rudraksha, gangaJal, kit].filter(Boolean).map((product, index) => ({ id: product!.id, label: product!.title, count: 3 - index })),
      searchTermsJson: [{ id: "rudraksha", label: "rudraksha", count: 1 }],
      lastActivityAt: new Date()
    },
    create: {
      tenantId,
      userId: customerId,
      topTagsJson: tags.map((tag, index) => ({ id: tag.id, label: tag.name, count: 4 - index })),
      topCategoriesJson: pujaCategory ? [{ id: pujaCategory.id, label: pujaCategory.name, count: 2 }] : [],
      topProductsJson: [rudraksha, gangaJal, kit].filter(Boolean).map((product, index) => ({ id: product!.id, label: product!.title, count: 3 - index })),
      topServicesJson: [],
      topFestivalsJson: [],
      searchTermsJson: [{ id: "rudraksha", label: "rudraksha", count: 1 }],
      lastActivityAt: new Date()
    }
  });
}

type MembershipBenefitSeed = {
  title: string;
  description: string;
  type: MembershipBenefitType;
  scope: MembershipBenefitScope;
  valueDecimal?: number;
  valueText?: string;
  usageLimit?: number;
  usagePeriod?: MembershipUsagePeriod;
  sortOrder: number;
};

async function seedMembershipEngine(tenantId: string) {
  const plans: Array<{
    name: string;
    slug: string;
    description: string;
    price: number;
    durationDays: number;
    sortOrder: number;
    featured: boolean;
    benefits: MembershipBenefitSeed[];
  }> = [
    {
      name: "Free Member",
      slug: "free-member",
      description: "A gentle starting membership for dashboard access, basic offers visibility, and festival reminders.",
      price: 0,
      durationDays: 365,
      sortOrder: 10,
      featured: false,
      benefits: [
        { title: "Basic dashboard access", description: "Access member dashboard surfaces and future member content placeholders.", type: "ACCESS", scope: "CONTENT", valueText: "basic_dashboard", sortOrder: 10 },
        { title: "Festival reminders placeholder", description: "Seasonal reminders and campaign visibility when festival surfaces are active.", type: "ACCESS", scope: "FESTIVAL", valueText: "reminders", sortOrder: 20 },
        { title: "Basic offers visibility", description: "See member-aware offers when promotion integration is enabled.", type: "ACCESS", scope: "SHOP", valueText: "basic_offers", sortOrder: 30 }
      ]
    },
    {
      name: "Premium Member",
      slug: "premium-member",
      description: "A practical yearly plan with shop, puja, support and festival benefits prepared for automatic checks.",
      price: 5001,
      durationDays: 365,
      sortOrder: 20,
      featured: true,
      benefits: [
        { title: "5% shop discount placeholder", description: "Discount preview; checkout integration coming next.", type: "DISCOUNT_PERCENT", scope: "SHOP", valueDecimal: 5, sortOrder: 10 },
        { title: "5% puja service discount placeholder", description: "Puja discount preview for future service checkout.", type: "DISCOUNT_PERCENT", scope: "PUJA", valueDecimal: 5, sortOrder: 20 },
        { title: "Priority support", description: "Priority support routing for member requests.", type: "PRIORITY_SUPPORT", scope: "SUPPORT", valueText: "priority", sortOrder: 30 },
        { title: "Festival early access", description: "Early access marker for festival campaigns.", type: "ACCESS", scope: "FESTIVAL", valueText: "early_access", sortOrder: 40 },
        { title: "Kundli benefit placeholder", description: "Available when Kundli module is enabled.", type: "CUSTOM", scope: "KUNDLI", valueText: "kundli_placeholder", sortOrder: 50 }
      ]
    },
    {
      name: "Divya Member",
      slug: "divya-member",
      description: "A deeper yearly membership for premium support, stronger discounts, future Kundli usage and wallet placeholder benefits.",
      price: 10001,
      durationDays: 365,
      sortOrder: 30,
      featured: false,
      benefits: [
        { title: "10% shop discount placeholder", description: "Discount preview; checkout integration coming next.", type: "DISCOUNT_PERCENT", scope: "SHOP", valueDecimal: 10, sortOrder: 10 },
        { title: "10% puja service discount placeholder", description: "Puja discount preview for future service checkout.", type: "DISCOUNT_PERCENT", scope: "PUJA", valueDecimal: 10, sortOrder: 20 },
        { title: "Priority support", description: "Highest priority support routing for member requests.", type: "PRIORITY_SUPPORT", scope: "SUPPORT", valueText: "divya_priority", sortOrder: 30 },
        { title: "1 basic Kundli benefit per month", description: "Available when Kundli module is enabled.", type: "FREE_USAGE", scope: "KUNDLI", usageLimit: 1, usagePeriod: "MONTHLY", valueText: "basic_kundli", sortOrder: 40 },
        { title: "Festival premium offers", description: "Premium festival campaign targeting marker.", type: "ACCESS", scope: "FESTIVAL", valueText: "premium_offers", sortOrder: 50 },
        { title: "Wallet bonus placeholder", description: "Wallet bonus will activate after wallet integration.", type: "WALLET_BONUS_PLACEHOLDER", scope: "GLOBAL", valueText: "wallet_bonus_future", sortOrder: 60 }
      ]
    }
  ];

  for (const planSeed of plans) {
    const plan = await prisma.membershipPlan.upsert({
      where: { tenantId_slug: { tenantId, slug: planSeed.slug } },
      update: {
        name: planSeed.name,
        description: planSeed.description,
        price: planSeed.price,
        currency: "INR",
        durationDays: planSeed.durationDays,
        status: "ACTIVE",
        sortOrder: planSeed.sortOrder,
        featured: planSeed.featured
      },
      create: {
        tenantId,
        name: planSeed.name,
        slug: planSeed.slug,
        description: planSeed.description,
        price: planSeed.price,
        currency: "INR",
        durationDays: planSeed.durationDays,
        status: "ACTIVE",
        sortOrder: planSeed.sortOrder,
        featured: planSeed.featured
      }
    });

    for (const benefitSeed of planSeed.benefits) {
      const benefit = await prisma.membershipBenefit.findFirst({
        where: { tenantId, planId: plan.id, title: benefitSeed.title },
        select: { id: true }
      });
      const benefitData = {
        tenantId,
        planId: plan.id,
        title: benefitSeed.title,
        description: benefitSeed.description,
        type: benefitSeed.type,
        scope: benefitSeed.scope,
        valueDecimal: "valueDecimal" in benefitSeed ? benefitSeed.valueDecimal ?? null : null,
        valueText: "valueText" in benefitSeed ? benefitSeed.valueText ?? null : null,
        usageLimit: "usageLimit" in benefitSeed ? benefitSeed.usageLimit ?? null : null,
        usagePeriod: "usagePeriod" in benefitSeed ? benefitSeed.usagePeriod ?? null : null,
        active: true,
        sortOrder: benefitSeed.sortOrder
      };
      const savedBenefit = benefit
        ? await prisma.membershipBenefit.update({ where: { id: benefit.id }, data: benefitData })
        : await prisma.membershipBenefit.create({ data: benefitData });

      const existingRule = await prisma.membershipRule.findFirst({
        where: { tenantId, planId: plan.id, benefitId: savedBenefit.id, ruleKey: "benefit_enabled" },
        select: { id: true }
      });
      const ruleData = {
        tenantId,
        planId: plan.id,
        benefitId: savedBenefit.id,
        scope: benefitSeed.scope,
        ruleKey: "benefit_enabled",
        ruleValueJson: {
          type: benefitSeed.type,
          valueDecimal: "valueDecimal" in benefitSeed ? benefitSeed.valueDecimal ?? null : null,
          valueText: "valueText" in benefitSeed ? benefitSeed.valueText ?? null : null,
          usageLimit: "usageLimit" in benefitSeed ? benefitSeed.usageLimit ?? null : null,
          usagePeriod: "usagePeriod" in benefitSeed ? benefitSeed.usagePeriod ?? null : null
        },
        active: true
      };
      if (existingRule) await prisma.membershipRule.update({ where: { id: existingRule.id }, data: ruleData });
      else await prisma.membershipRule.create({ data: ruleData });
    }
  }
}

async function seedChecklistTemplates(tenantId: string) {
  const templates = [
    {
      workType: "ASTHI_APPLICATION",
      name: "Asthi Application Verification Checklist",
      description: "Verification, scheduling, assignment, proof and completion steps for Asthi applications.",
      sortOrder: 10,
      items: [
        ["Confirm payment status", "Operations confirms mock/manual payment state.", true, "Operations", false, false, 12],
        ["Review applicant details", "Check applicant, deceased, family and ritual details.", true, "Operations", true, false, 24],
        ["Review required documents", "Check death certificate, ID proof and relation proof placeholders.", true, "Document Reviewer", true, true, 36],
        ["Confirm holy place/date", "Confirm ritual place, preferred date and scheduling feasibility.", true, "Asthi Coordinator", true, false, 48],
        ["Assign operator/pandit", "Assign ritual owner or coordinator.", true, "Asthi Operations", false, false, 60],
        ["Upload proof/certificate note", "Add customer-visible proof, certificate or completion placeholder.", true, "Asthi Operations", true, true, 96],
        ["Mark completion", "Close the application after required proof and notes are present.", true, "Operations Lead", true, false, 120]
      ]
    },
    {
      workType: "SERVICE_BOOKING",
      name: "Puja / Service Booking Checklist",
      description: "Payment, schedule, capacity, assignment, delivery proof and closure steps for service bookings.",
      sortOrder: 20,
      items: [
        ["Confirm payment/manual review", "Confirm mock payment or manual review state.", true, "Operations", false, false, 12],
        ["Confirm date/time/location", "Validate requested service date, time and location.", true, "Service Coordinator", true, false, 24],
        ["Confirm capacity/queue status", "Check capacity slot, queue or manual capacity decision.", true, "Capacity Owner", false, false, 24],
        ["Assign pandit/operator", "Assign service owner or pandit placeholder.", true, "Pandit / Operator", true, false, 48],
        ["Complete service", "Record service progress and completion.", true, "Pandit / Operator", true, false, 96],
        ["Upload proof/report", "Attach proof or customer-visible report placeholder.", false, "Operations", true, true, 120],
        ["Close booking", "Close booking after required work is done.", true, "Operations Lead", true, false, 144]
      ]
    },
    {
      workType: "KUNDLI_ORDER",
      name: "Kundli Report Delivery Checklist",
      description: "Intake, assignment, report placeholder and delivery steps for Kundli orders.",
      sortOrder: 30,
      items: [
        ["Confirm payment", "Confirm mock payment before report work starts.", true, "Operations", false, false, 12],
        ["Review birth details", "Check birth name, date, time, place and language fields.", true, "Kundli Intake", true, false, 24],
        ["Check partner details if matching", "Review partner details where matching package requires them.", false, "Kundli Intake", false, false, 36],
        ["Assign astrologer", "Assign astrologer or report reviewer placeholder.", true, "Astrologer", true, false, 48],
        ["Upload report URL/document placeholder", "Add customer-visible report URL or managed document placeholder.", true, "Astrologer", true, true, 96],
        ["Mark delivered", "Mark report/consultation output delivered.", true, "Operations", true, false, 120],
        ["Close order", "Close Kundli order after delivery and required notes.", true, "Operations Lead", false, false, 144]
      ]
    },
    {
      workType: "ORDER_FULFILMENT",
      name: "Product Order Fulfilment Checklist",
      description: "Paid order, inventory, packing, tracking and delivery control checklist.",
      sortOrder: 40,
      items: [
        ["Confirm paid status", "Confirm successful mock payment before fulfilment.", true, "Fulfilment", false, false, 6],
        ["Check inventory movement", "Review reserved/sold inventory movements.", true, "Inventory", false, false, 12],
        ["Pack order", "Pack physical products and kits.", true, "Fulfilment", true, false, 24],
        ["Add tracking placeholder", "Add courier/tracking placeholder when available.", false, "Fulfilment", true, false, 36],
        ["Mark shipped", "Move fulfilment to shipped when dispatch placeholder is ready.", true, "Fulfilment", true, false, 48],
        ["Mark delivered", "Mark delivered after manual confirmation.", true, "Fulfilment", true, false, 96]
      ]
    },
    {
      workType: "DOCUMENT_REVIEW",
      name: "Document Review Checklist",
      description: "Internal review checklist for requested, uploaded and rejected documents.",
      sortOrder: 50,
      items: [
        ["Check document owner", "Confirm the document belongs to the correct customer/workflow.", true, "Document Reviewer", false, false, 8],
        ["Review uploaded URL/storage key", "Verify placeholder URL/storage key and metadata.", true, "Document Reviewer", false, true, 12],
        ["Approve or request reupload", "Approve, reject or request reupload with reason.", true, "Document Reviewer", true, false, 24],
        ["Update customer visibility", "Expose only safe customer-visible files or notes.", false, "Operations", true, false, 24]
      ]
    },
    {
      workType: "PROOF_DELIVERY",
      name: "Proof / Report Delivery Checklist",
      description: "Proof, certificate, report and delivery placeholder validation.",
      sortOrder: 60,
      items: [
        ["Prepare proof/report placeholder", "Add proof, certificate or report placeholder URL.", true, "Operations", false, true, 24],
        ["Review customer-visible note", "Ensure customer note is clear and safe.", true, "Operations Lead", false, false, 36],
        ["Publish to customer", "Mark item customer-visible when ready.", true, "Operations", true, false, 48],
        ["Confirm closure readiness", "Confirm no required checklist or document blocker remains.", true, "Operations Lead", false, false, 72]
      ]
    }
  ] as const;

  for (const templateSeed of templates) {
    const template = await prisma.checklistTemplate.upsert({
      where: {
        tenantId_workType_name: {
          tenantId,
          workType: templateSeed.workType,
          name: templateSeed.name
        }
      },
      update: {
        description: templateSeed.description,
        status: "ACTIVE",
        sortOrder: templateSeed.sortOrder
      },
      create: {
        tenantId,
        workType: templateSeed.workType,
        name: templateSeed.name,
        description: templateSeed.description,
        status: "ACTIVE",
        sortOrder: templateSeed.sortOrder
      }
    });

    for (let index = 0; index < templateSeed.items.length; index += 1) {
      const [title, description, required, defaultOwnerRole, customerVisibleMilestone, proofRequired, dueOffsetHours] = templateSeed.items[index];
      const existing = await prisma.checklistTemplateItem.findFirst({
        where: { tenantId, templateId: template.id, title }
      });
      const data = {
        tenantId,
        templateId: template.id,
        title,
        description,
        required,
        defaultOwnerRole,
        customerVisibleMilestone,
        proofRequired,
        dueOffsetHours,
        status: "ACTIVE",
        sortOrder: (index + 1) * 10
      };

      if (existing) {
        await prisma.checklistTemplateItem.update({ where: { id: existing.id }, data });
      } else {
        await prisma.checklistTemplateItem.create({ data });
      }
    }
  }
}


async function upsertDemoAssignment(seed: {
  tenantId: string;
  workType: string;
  workId: string;
  assignedRole: string;
  assignedUserId?: string;
  assignmentLabel: string;
  createdById: string;
  priority?: string;
  internalNote?: string;
}) {
  const existing = await prisma.assignment.findFirst({
    where: {
      tenantId: seed.tenantId,
      workType: seed.workType,
      workId: seed.workId,
      assignedRole: seed.assignedRole,
      assignmentLabel: seed.assignmentLabel
    },
    select: { id: true }
  });

  const data = {
    tenantId: seed.tenantId,
    workType: seed.workType,
    workId: seed.workId,
    assignedRole: seed.assignedRole,
    assignedUserId: seed.assignedUserId ?? null,
    assignmentLabel: seed.assignmentLabel,
    createdById: seed.createdById,
    priority: seed.priority ?? "NORMAL",
    internalNote: seed.internalNote ?? null
  };

  if (existing) {
    await prisma.assignment.update({ where: { id: existing.id }, data });
  } else {
    await prisma.assignment.create({ data });
  }
}

async function seedRestrictedRoleDemoAssignments(tenantId: string, adminId: string, restrictedUsers: Record<string, { id: string }>) {
  const [order, serviceBooking, asthiApplication, kundliOrder] = await Promise.all([
    prisma.order.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { id: true } }),
    prisma.serviceBooking.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { id: true } }),
    prisma.asthiApplication.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { id: true } }),
    prisma.kundliOrder.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { id: true } })
  ]);

  if (order) {
    await upsertDemoAssignment({
      tenantId,
      workType: "ORDER",
      workId: order.id,
      assignedRole: "VENDOR",
      assignedUserId: restrictedUsers.VENDOR?.id,
      assignmentLabel: "Vendor fulfilment and dispatch placeholder",
      createdById: adminId,
      priority: "HIGH",
      internalNote: "Demo vendor can update dispatch/proof placeholders only."
    });
  }

  if (serviceBooking) {
    await upsertDemoAssignment({
      tenantId,
      workType: "SERVICE_BOOKING",
      workId: serviceBooking.id,
      assignedRole: "PANDIT",
      assignedUserId: restrictedUsers.PANDIT?.id,
      assignmentLabel: "Pandit service preparation",
      createdById: adminId,
      priority: "NORMAL",
      internalNote: "Demo pandit can update assigned service progress and proof placeholders."
    });
    await upsertDemoAssignment({
      tenantId,
      workType: "SERVICE_BOOKING",
      workId: serviceBooking.id,
      assignedRole: "OPERATOR",
      assignedUserId: restrictedUsers.OPERATOR?.id,
      assignmentLabel: "Operator service coordination",
      createdById: adminId,
      priority: "NORMAL",
      internalNote: "Demo operator can coordinate assigned booking progress."
    });
  }

  if (asthiApplication) {
    await upsertDemoAssignment({
      tenantId,
      workType: "ASTHI_APPLICATION",
      workId: asthiApplication.id,
      assignedRole: "RURAL_SUBADMIN",
      assignedUserId: restrictedUsers.RURAL_SUBADMIN?.id,
      assignmentLabel: "Rural subadmin Asthi coordination",
      createdById: adminId,
      priority: "HIGH",
      internalNote: "Demo rural subadmin can manage assigned Asthi coordination placeholders."
    });
  }

  if (kundliOrder) {
    await upsertDemoAssignment({
      tenantId,
      workType: "KUNDLI_ORDER",
      workId: kundliOrder.id,
      assignedRole: "ASTROLOGER",
      assignedUserId: restrictedUsers.ASTROLOGER?.id,
      assignmentLabel: "Astrologer report placeholder",
      createdById: adminId,
      priority: "HIGH",
      internalNote: "Demo astrologer can update report placeholder and progress only."
    });
  }
}

async function upsertHeroSlide(seed: {
  tenantId: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  badgeText: string;
  desktopImageUrl: string;
  mobileImageUrl?: string | null;
  imageAlt: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  linkType: "CUSTOM" | "PRODUCT" | "SERVICE" | "FESTIVAL" | "OFFER" | "MEMBERSHIP" | "ASTHI" | "KUNDLI";
  themeVariant: "DARK_OVERLAY" | "LIGHT_OVERLAY" | "CREAM_CARD" | "SAFFRON_GOLD";
  overlayStrength: "NONE" | "LIGHT" | "MEDIUM" | "STRONG";
  sortOrder: number;
}) {
  const existing = await prisma.heroSlide.findFirst({ where: { tenantId: seed.tenantId, title: seed.title }, select: { id: true } });
  const data = {
    tenantId: seed.tenantId,
    title: seed.title,
    subtitle: seed.subtitle,
    eyebrow: seed.eyebrow,
    badgeText: seed.badgeText,
    desktopImageUrl: seed.desktopImageUrl,
    mobileImageUrl: seed.mobileImageUrl ?? seed.desktopImageUrl,
    imageAlt: seed.imageAlt,
    primaryCtaLabel: seed.primaryCtaLabel,
    primaryCtaUrl: seed.primaryCtaUrl,
    secondaryCtaLabel: seed.secondaryCtaLabel ?? null,
    secondaryCtaUrl: seed.secondaryCtaUrl ?? null,
    linkType: seed.linkType,
    themeVariant: seed.themeVariant,
    textAlign: "LEFT" as const,
    overlayStrength: seed.overlayStrength,
    isActive: true,
    sortOrder: seed.sortOrder
  };

  if (existing) await prisma.heroSlide.update({ where: { id: existing.id }, data });
  else await prisma.heroSlide.create({ data });
}

async function seedHeroSlides(tenantId: string) {
  await upsertHeroSlide({
    tenantId,
    eyebrow: "SHRAVAN SPECIAL",
    title: "Shravan Puja Essentials and Seva",
    subtitle: "Curated samagri, ritual support and spiritual services for the holy month of Shravan.",
    badgeText: "Festival Pick",
    desktopImageUrl: "https://images.unsplash.com/photo-1604608672516-8e6c6ed88492?auto=format&fit=crop&w=1800&q=80",
    imageAlt: "Puja samagri and ritual essentials arranged for Shravan worship",
    primaryCtaLabel: "Shop Shravan Picks",
    primaryCtaUrl: "/shop",
    secondaryCtaLabel: "Explore Services",
    secondaryCtaUrl: "/services",
    linkType: "CUSTOM",
    themeVariant: "DARK_OVERLAY",
    overlayStrength: "MEDIUM",
    sortOrder: 1
  });

  await upsertHeroSlide({
    tenantId,
    eyebrow: "GUIDED RITUAL SERVICE",
    title: "Asthi Visarjan with Care and Dignity",
    subtitle: "A guided sacred service with application tracking, document support and admin-assisted coordination.",
    badgeText: "Featured Seva",
    desktopImageUrl: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?auto=format&fit=crop&w=1800&q=80",
    imageAlt: "Sacred river steps at sunrise for ritual service",
    primaryCtaLabel: "Start Application",
    primaryCtaUrl: "/services/asthi-visarjan",
    secondaryCtaLabel: "How It Works",
    secondaryCtaUrl: "/services/asthi-visarjan",
    linkType: "ASTHI",
    themeVariant: "DARK_OVERLAY",
    overlayStrength: "STRONG",
    sortOrder: 2
  });

  await upsertHeroSlide({
    tenantId,
    eyebrow: "DIVYA MEMBERSHIP",
    title: "Spiritual Benefits for Every Devotee",
    subtitle: "Unlock member benefits, priority support and devotional services through OMDivyaDarshan membership.",
    badgeText: "Membership",
    desktopImageUrl: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1800&q=80",
    imageAlt: "Temple lamps and warm devotional setting for membership benefits",
    primaryCtaLabel: "View Membership",
    primaryCtaUrl: "/membership",
    secondaryCtaLabel: "Explore Benefits",
    secondaryCtaUrl: "/membership",
    linkType: "MEMBERSHIP",
    themeVariant: "SAFFRON_GOLD",
    overlayStrength: "MEDIUM",
    sortOrder: 3
  });
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


  const restrictedDemoUsers = [
    { email: "operations@omdivyadarshan.local", name: "Demo Operations Admin", password: "Ops@123", role: "OPERATIONS_ADMIN" },
    { email: "support@omdivyadarshan.local", name: "Demo Support Agent", password: "Support@123", role: "SUPPORT_AGENT" },
    { email: "product@omdivyadarshan.local", name: "Demo Product Manager", password: "Product@123", role: "PRODUCT_MANAGER" },
    { email: "vendor@omdivyadarshan.local", name: "Demo Vendor", password: "Vendor@123", role: "VENDOR" },
    { email: "rural@omdivyadarshan.local", name: "Demo Rural Subadmin", password: "Rural@123", role: "RURAL_SUBADMIN" },
    { email: "pandit@omdivyadarshan.local", name: "Demo Pandit", password: "Pandit@123", role: "PANDIT" },
    { email: "astrologer@omdivyadarshan.local", name: "Demo Astrologer", password: "Astro@123", role: "ASTROLOGER" },
    { email: "operator@omdivyadarshan.local", name: "Demo Operator", password: "Operator@123", role: "OPERATOR" }
  ];

  const restrictedUsers: Record<string, { id: string }> = {};
  for (const demoUser of restrictedDemoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        name: demoUser.name,
        passwordHash: await hashPassword(demoUser.password),
        status: "ACTIVE",
        verifiedEmail: true
      },
      create: {
        tenantId: tenant.id,
        email: demoUser.email,
        name: demoUser.name,
        passwordHash: await hashPassword(demoUser.password),
        status: "ACTIVE",
        verifiedEmail: true
      },
      select: { id: true }
    });
    restrictedUsers[demoUser.role] = user;
  }
  const customerAddress = await prisma.customerAddress.findFirst({
    where: { tenantId: tenant.id, userId: customer.id, pincode: "221001" },
    select: { id: true }
  });
  const customerAddressData = {
    tenantId: tenant.id,
    userId: customer.id,
    fullName: "Demo Customer",
    phone: "9999999999",
    addressLine1: "Assi Ghat Road",
    addressLine2: "Near OMD demo residence",
    city: "Varanasi",
    state: "Uttar Pradesh",
    country: "India",
    pincode: "221001",
    landmark: "Assi Ghat",
    isDefault: true
  };

  if (customerAddress) {
    await prisma.customerAddress.update({ where: { id: customerAddress.id }, data: customerAddressData });
  } else {
    await prisma.customerAddress.create({ data: customerAddressData });
  }

  const existingCustomerNote = await prisma.customerNote.findFirst({
    where: { tenantId: tenant.id, customerId: customer.id, category: "GENERAL", note: "Demo internal support note for admin-only customer context." },
    select: { id: true }
  });
  if (!existingCustomerNote) {
    await prisma.customerNote.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        createdById: admin.id,
        category: "GENERAL",
        note: "Demo internal support note for admin-only customer context."
      }
    });
  }

  await assignRole(tenant.id, customer.id, "CUSTOMER");
  await assignRole(tenant.id, admin.id, "SUPER_ADMIN");
  for (const demoUser of restrictedDemoUsers) {
    await assignRole(tenant.id, restrictedUsers[demoUser.role].id, demoUser.role);
  }
  await seedTagGraph(tenant.id);
  await seedCatalog(tenant.id);
  await seedProductExperience(tenant.id, customer.id);
  await seedMerchandising(tenant.id);
  await seedHeroSlides(tenant.id);
  await seedPremiumCommerce(tenant.id);
  await seedKundliModule(tenant.id);
  await seedAsthiModule(tenant.id);
  await seedMembershipEngine(tenant.id);
  await seedSmartSearchTagRelations(tenant.id);
  await seedServiceOperationsFoundation(tenant.id);
  await seedOperationalDocumentShell(tenant.id);
  await seedChecklistTemplates(tenant.id);
  await seedRestrictedRoleDemoAssignments(tenant.id, admin.id, restrictedUsers);
  await seedCustomerEventTracking(tenant.id, customer.id);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
