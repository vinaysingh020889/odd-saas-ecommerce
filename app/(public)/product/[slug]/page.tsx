import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { ProductMediaGallery } from "@/components/product-media-gallery";
import { PremiumProductBuyBox } from "@/components/premium-product-buy-box";
import { TagChips } from "@/components/tag-chips";
import { getCurrentUser } from "@/lib/auth/session";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { getVariantStockSummaries, isPhysicalInventoryType } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { getRelatedProducts, getRelatedServices, getRequiredSamagri } from "@/lib/recommendations";
import { getEntityTags } from "@/lib/tag-relations";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string; pincode?: string }>;
};

type DetailCard = {
  title: string;
  body: string;
  items?: string[];
};

type RecommendationProduct = {
  id: string;
  slug: string;
  title: string;
  currency: string;
  basePrice: unknown;
  mrp: unknown;
  shortDescription?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  variants: Array<{ id: string; price: unknown; mrp?: unknown }>;
  media?: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
  reviews?: Array<{ rating: number }>;
};

function stockLabel(stock: { available: number; status: string } | null | undefined) {
  if (!stock) return "Stock Setup Pending";
  if (stock.status === "OUT_OF_STOCK") return "Out of Stock";
  if (stock.status === "LOW_STOCK") return `Only ${stock.available} Left`;
  return "In Stock";
}

function discountPercent(price: unknown, mrp: unknown) {
  const p = Number(price ?? 0);
  const m = Number(mrp ?? 0);
  if (!p || !m || m <= p) return null;
  return Math.round(((m - p) / m) * 100);
}

function typeLabel(type: string) {
  if (type === "PHYSICAL") return "Product";
  return type.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mediaForProduct(product: {
  id: string;
  title: string;
  imageUrl: string | null;
  media: Array<{ id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number }>;
}) {
  const media = product.media.map((item) => ({ id: item.id, url: item.url, altText: item.altText ?? product.title }));
  if (media.length > 0) return media;
  if (product.imageUrl) return [{ id: "legacy-image", url: product.imageUrl, altText: product.title }];
  return [];
}

function isAsthiOffering(product: { title: string; slug: string; category?: { name: string } | null }) {
  const text = `${product.title} ${product.slug} ${product.category?.name ?? ""}`.toLowerCase();
  return text.includes("asthi") || text.includes("visarjan");
}

function detailCardsFor(product: {
  type: string;
  title: string;
  category?: { name: string } | null;
  slug: string;
  kitComponents: Array<{
    quantity: number;
    componentProduct: { title: string; type: string };
    componentVariant: { title: string | null; sku: string | null } | null;
  }>;
}): DetailCard[] {
  if (product.type === "KIT") {
    const componentItems = product.kitComponents.length
      ? product.kitComponents.map((component) => {
          const variant = component.componentVariant?.title ?? component.componentVariant?.sku;
          return `${component.componentProduct.title}${variant ? ` - ${variant}` : ""} x ${component.quantity}`;
        })
      : ["Configured kit contents will appear here when components are added in admin."];

    return [
      { title: "Description", body: `${product.title} is a curated kit designed to make devotional preparation easier and more complete.` },
      { title: "What's Inside", body: "Kit components are managed from admin and snapshot into orders during purchase.", items: componentItems },
      { title: "Product Details", body: "Best suited for devotees who want a ready-to-use selection rather than shopping individual components." },
      { title: "FAQs", body: "Stock-aware checkout and fulfilment use the kit component configuration managed from admin." }
    ];
  }

  if (product.type === "SERVICE") {
    if (isAsthiOffering(product)) {
      return [
        { title: "Description", body: "A guided Asthi Visarjan service journey with respectful support, application tracking, and mock payment in this demo phase." },
        { title: "What's Inside", body: "Document metadata placeholders for death certificate, applicant identity proof, relation proof, and supporting documents." },
        { title: "Product Details", body: "Apply, share details, complete review and mock payment, then track scheduling, ritual completion and proof updates." },
        { title: "FAQs", body: "Application status, payment status, document status, and activity timeline are visible after the application is created." }
      ];
    }

    return [
      { title: "Description", body: "A guided service offering designed for devotional support through the OMDivyaDarshan commerce engine." },
      { title: "What's Inside", body: "Service details, payment review, and order tracking are available in the customer journey." },
      { title: "Product Details", body: "Choose the service, complete checkout with mock payment, and follow service status in your account." },
      { title: "FAQs", body: "Capacity, scheduling, and fulfilment workflows are intentionally limited to safe placeholder operations in this phase." }
    ];
  }

  return [
    { title: "Description", body: `${product.title} is part of the ${product.category?.name ?? "OMDivyaDarshan"} catalog, prepared for a premium devotional shopping experience.` },
    { title: "What's Inside", body: "Curated for devotional quality, easy discovery, and clear checkout with stock-aware purchase behavior." },
    { title: "Product Details", body: "Use according to your family practice, pujari guidance, or personal daily devotional routine." },
    { title: "FAQs", body: "Fulfilment and courier integrations are placeholders in this phase; admin can still process mock order fulfilment." }
  ];
}

function contentItems(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="tracking-[1px] text-omd-saffron">*****</span>
      <span className="font-semibold text-omd-brown">{count ? rating.toFixed(1) : "New"}</span>
      <span className="text-omd-muted">({count} reviews)</span>
    </div>
  );
}

function ProductSummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-omd-brown">
      <span className="h-2 w-2 rounded-full bg-omd-success" />
      {label}: <span className="font-bold">{value}</span>
    </span>
  );
}

function MemberBenefitStrip() {
  return (
    <div className="mt-6 grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-md border border-[#ead7bf] bg-white/80 px-4 py-3 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-omd-ivory text-omd-saffron">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3l3 6 6 .8-4.5 4.3 1.1 6-5.6-3-5.6 3 1.1-6L3 9.8 9 9z" />
        </svg>
      </span>
      <span>
        <span className="block text-sm font-bold text-omd-brown">Extra benefits for Divya Members</span>
        <span className="mt-0.5 block text-xs text-omd-muted">Enjoy member-only prices, priority support and more.</span>
      </span>
      <Link href="/membership" className="hidden text-xs font-bold text-omd-saffron hover:text-omd-brown sm:inline">Learn More</Link>
    </div>
  );
}

function ProductInfoPanel({
  cards,
  specs,
  faqs,
  reviewCount
}: {
  cards: DetailCard[];
  specs: Array<{ id: string; label: string; value: string }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
  reviewCount: number;
}) {
  const description = cards[0];
  const inside = cards.find((card) => card.title.toLowerCase().includes("inside") || card.title.toLowerCase().includes("included"));
  const productDetails = cards.find((card) => card.title.toLowerCase().includes("detail"));

  return (
    <section className="overflow-hidden rounded-lg border border-[#ead7bf] bg-white shadow-sm">
      <div className="flex gap-7 overflow-x-auto border-b border-[#ead7bf] px-5 text-sm font-bold text-omd-brown">
        {["Description", "What's Inside", "Product Details", "FAQs", `Reviews (${reviewCount})`].map((tab, index) => (
          <span key={tab} className={`shrink-0 py-4 ${index === 0 ? "border-b-2 border-omd-saffron text-omd-saffron" : "text-omd-brown"}`}>{tab}</span>
        ))}
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="text-sm leading-7 text-omd-muted">
          <p>{description?.body ?? "Details coming soon."}</p>
          {description?.items?.length ? (
            <ul className="mt-3 list-disc pl-5">
              {description.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
          {inside && inside !== description ? <p className="mt-3">{inside.body}</p> : null}
          {inside?.items?.length ? (
            <ul className="mt-2 list-disc pl-5">
              {inside.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </div>
        <div className="grid content-start gap-3 text-sm">
          {specs.length ? specs.slice(0, 6).map((spec) => (
            <div key={spec.id} className="grid grid-cols-[130px_1fr] gap-4">
              <span className="font-bold text-omd-brown">{spec.label}</span>
              <span className="text-omd-muted">{spec.value}</span>
            </div>
          )) : (
            <p className="text-omd-muted">{productDetails?.body ?? "Product specifications will appear here when added in admin."}</p>
          )}
          {faqs[0] ? (
            <div className="mt-2 border-t border-omd-sand pt-3">
              <p className="font-bold text-omd-brown">{faqs[0].question}</p>
              <p className="mt-1 text-omd-muted">{faqs[0].answer}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function recommendationImage(item: RecommendationProduct) {
  return item.media?.find((media) => media.isPrimary)?.url ?? item.media?.[0]?.url ?? item.imageUrl ?? null;
}

function recommendationRating(item: RecommendationProduct) {
  if (!item.reviews?.length) return null;
  const total = item.reviews.reduce((sum, review) => sum + review.rating, 0);
  return { average: Math.round((total / item.reviews.length) * 10) / 10, count: item.reviews.length };
}

function CompactRecommendationCard({ item }: { item: RecommendationProduct }) {
  const image = recommendationImage(item);
  const price = Number(item.variants[0]?.price ?? item.basePrice ?? 0);
  const mrp = Number(item.variants[0]?.mrp ?? item.mrp ?? 0);
  const discount = discountPercent(price, mrp);
  const rating = recommendationRating(item);

  return (
    <Link href={`/product/${item.slug}`} className="group overflow-hidden rounded-md border border-[#ead7bf] bg-white p-1.5 shadow-sm transition hover:-translate-y-0.5 hover:border-omd-gold hover:shadow-md">
      <div className="overflow-hidden rounded bg-omd-ivory">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="aspect-[1.65/1] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="flex aspect-[1.65/1] items-center justify-center text-xs font-bold uppercase text-omd-saffron">OMD</span>
        )}
      </div>
      <div className="px-1.5 py-2">
        <h3 className="line-clamp-1 text-sm font-bold text-omd-brown group-hover:text-omd-saffron">{item.title}</h3>
        {rating ? <p className="mt-1 text-xs text-omd-muted"><span className="text-omd-saffron">*</span> {rating.average} ({rating.count})</p> : null}
        <p className="mt-1 flex flex-wrap items-baseline gap-2 text-sm font-bold text-omd-brown">
          {formatMoney(price, item.currency)}
          {mrp > price ? <span className="text-xs font-normal text-omd-muted line-through">{formatMoney(mrp, item.currency)}</span> : null}
          {discount ? <span className="text-xs font-bold text-omd-success">{discount}% OFF</span> : null}
        </p>
      </div>
    </Link>
  );
}

function TrustBand() {
  const items = [
    ["100% Authentic", "Ritual-ready products sourced with purity and devotion."],
    ["Secure Payments", "Safe, encrypted mock payments with multiple options."],
    ["Guided Services", "Expert-led seva and rituals with full guidance."],
    ["Devotional Quality", "Crafted with devotion and care for your spiritual journey."]
  ];

  return (
    <section className="grid gap-5 rounded-lg border border-[#ead7bf] bg-white/85 px-5 py-5 shadow-sm md:grid-cols-4">
      {items.map(([title, description]) => (
        <div key={title} className="grid grid-cols-[44px_1fr] gap-3 border-[#ead7bf] md:border-r md:last:border-r-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-omd-gold/40 text-omd-saffron">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3l3 6 6 .8-4.5 4.3 1.1 6-5.6-3-5.6 3 1.1-6L3 9.8 9 9z" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-bold text-omd-brown">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-omd-muted">{description}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const [{ slug }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const tenantId = await getOmdTenantId();
  const product = await prisma.product.findFirst({
    where: { tenantId, slug, status: "ACTIVE" },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
      media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      specs: { orderBy: [{ groupName: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      faqs: { where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      contentBlocks: { where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      reviews: { where: { status: "approved" }, orderBy: { createdAt: "desc" }, take: 8 },
      kitComponents: {
        include: {
          componentProduct: { select: { title: true, type: true } },
          componentVariant: { select: { title: true, sku: true } }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!product) notFound();

  const isPhysical = isPhysicalInventoryType(product.type);
  const requestedPincode = query.pincode?.trim() ?? "";
  const [stockByVariant, reviewStats, wishlistItem, deliveryZone, tagRelations, relatedProducts, relatedServices, requiredSamagri] = await Promise.all([
    getVariantStockSummaries(isPhysical ? product.variants.map((variant) => variant.id) : []),
    prisma.productReview.aggregate({
      where: { tenantId, productId: product.id, status: "approved" },
      _avg: { rating: true },
      _count: { rating: true }
    }),
    user
      ? prisma.wishlistItem.findFirst({
          where: { tenantId, userId: user.id, productId: product.id },
          select: { id: true }
        })
      : null,
    requestedPincode
      ? prisma.serviceablePincode.findUnique({
          where: { tenantId_pincode: { tenantId, pincode: requestedPincode } }
        })
      : null,
    getEntityTags(tenantId, product.type === "SERVICE" ? "SERVICE" : "PRODUCT", product.id),
    getRelatedProducts({ tenantId, currentProductId: product.id, categoryId: product.categoryId, currentType: product.type, limit: 6 }),
    getRelatedServices({ tenantId, targetType: product.type === "SERVICE" ? "SERVICE" : "PRODUCT", targetId: product.id, categoryId: product.categoryId, limit: 3 }),
    product.type === "SERVICE" ? getRequiredSamagri({ tenantId, serviceId: product.id, limit: 6 }) : Promise.resolve([])
  ]);

  const lowestVariant = product.variants[0];
  const price = lowestVariant?.price ?? product.basePrice;
  const mrp = lowestVariant?.mrp ?? product.mrp;
  const discount = discountPercent(price, mrp);
  const savings = Number(mrp ?? 0) > Number(price ?? 0) ? Number(mrp) - Number(price) : 0;
  const averageRating = reviewStats._avg.rating ?? 0;
  const reviewCount = reviewStats._count.rating;
  const galleryMedia = mediaForProduct(product);
  const structuredDetailCards = product.contentBlocks.map((block) => ({
    title: block.title,
    body: block.body,
    items: contentItems(block.itemsJson)
  }));
  const detailCards = structuredDetailCards.length ? structuredDetailCards : detailCardsFor(product);
  const firstStock = lowestVariant?.id ? stockByVariant.get(lowestVariant.id) : null;
  const availability = isPhysical ? stockLabel(firstStock) : product.type === "SERVICE" ? "Service Available" : "Available";
  const breadcrumbRoot = product.type === "SERVICE" ? { label: "Services", href: "/services" } : { label: "Shop", href: "/shop" };
  const variantOptions = product.variants.length
    ? product.variants.map((variant) => {
        const stock = stockByVariant.get(variant.id);
        return {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: Number(variant.price ?? product.basePrice ?? 0),
          mrp: variant.mrp ? Number(variant.mrp) : null,
          stockLabel: isPhysical ? stockLabel(stock) : variant.sku ? variant.sku : "Available",
          disabled: isPhysical ? !stock || stock.available <= 0 : false
        };
      })
    : [{ id: "", title: "Default Option", sku: null, price: Number(price ?? 0), mrp: mrp ? Number(mrp) : null, stockLabel: availability, disabled: false }];
  const deliveryResult = !requestedPincode
    ? ({ kind: "none" } as const)
    : deliveryZone
      ? deliveryZone.serviceable
        ? ({ kind: "serviceable", pincode: requestedPincode, city: deliveryZone.city, state: deliveryZone.state, estimatedDays: deliveryZone.estimatedDays } as const)
        : ({ kind: "unserviceable", pincode: requestedPincode, city: deliveryZone.city, state: deliveryZone.state } as const)
      : ({ kind: "unknown", pincode: requestedPincode } as const);
  const sku = lowestVariant?.sku ?? "OMD-PRODUCT";
  const galleryBadges = [discount ? `${discount}% OFF` : null].filter((item): item is string => Boolean(item));
  const assignedTags = tagRelations.map((relation) => relation.tag).filter((tag) => tag.status === "ACTIVE");
  const productRecommendations = product.type === "SERVICE" ? requiredSamagri : relatedProducts;

  return (
    <article className="grid gap-6 pb-2">
      <CustomerEventBeacon
        eventType={product.type === "SERVICE" ? "SERVICE_VIEW" : product.type === "MEMBERSHIP" ? "MEMBERSHIP_VIEWED" : "PRODUCT_VIEW"}
        entityType={product.type === "SERVICE" ? "SERVICE" : product.type === "MEMBERSHIP" ? "MEMBERSHIP_PLAN" : "PRODUCT"}
        entityId={product.id}
        entitySlug={product.slug}
        metadata={{
          title: product.title,
          productType: product.type,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? null,
          tags: assignedTags.map((tag) => ({ id: tag.id, name: tag.name, type: tag.type }))
        }}
      />

      <nav className="flex flex-wrap items-center gap-2 text-sm text-omd-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-omd-saffron">Home</Link>
        <span>/</span>
        <Link href={breadcrumbRoot.href} className="hover:text-omd-saffron">{breadcrumbRoot.label}</Link>
        <span>/</span>
        {product.category ? (
          <>
            <Link href={`/shop/category/${product.category.slug}`} className="hover:text-omd-saffron">{product.category.name}</Link>
            <span>/</span>
          </>
        ) : null}
        <span className="text-omd-brown">{product.title}</span>
      </nav>

      <section className="grid gap-7 xl:grid-cols-[minmax(0,610px)_minmax(320px,430px)_minmax(330px,390px)] xl:items-start">
        <ProductMediaGallery media={galleryMedia} title={product.title} category={product.category?.name} badges={galleryBadges} wishlistActive={Boolean(wishlistItem)} />

        <section className="min-w-0 py-1 xl:pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-omd-saffron">{product.category?.name ?? typeLabel(product.type)}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-omd-brown lg:text-4xl">{product.title}</h1>
          {product.shortDescription ?? product.description ? <p className="mt-4 max-w-xl text-base leading-7 text-omd-muted">{product.shortDescription ?? product.description}</p> : null}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {product.ratingsEnabled ? <StarRating rating={averageRating} count={reviewCount} /> : null}
            <span className="text-sm font-bold text-omd-brown">Trusted by 10K+ devotees</span>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <p className="text-4xl font-bold tracking-tight text-omd-brown">{formatMoney(price, product.currency)}</p>
            {mrp ? <p className="pb-1 text-base text-omd-muted line-through">{formatMoney(mrp, product.currency)}</p> : null}
            {savings ? <p className="pb-1 text-sm font-bold text-omd-success">Save {formatMoney(savings, product.currency)} {discount ? `(${discount}%)` : ""}</p> : null}
          </div>
          <p className="mt-3 text-sm text-omd-muted">Inclusive of all taxes</p>

          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
            <ProductSummaryMetric label="Availability" value={availability} />
            <span className="text-sm font-semibold text-omd-brown">SKU: <span className="font-bold">{sku}</span></span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <TagChips tags={assignedTags} />
          </div>

          <MemberBenefitStrip />
        </section>

        <PremiumProductBuyBox
          title={product.title}
          eyebrow={product.category?.name ?? typeLabel(product.type)}
          description={product.shortDescription ?? product.description}
          productId={product.id}
          productSlug={product.slug}
          variants={variantOptions}
          requestedPincode={requestedPincode}
          deliveryResult={deliveryResult}
          wishlistActive={Boolean(wishlistItem)}
          currency={product.currency}
        />
      </section>

      <ProductInfoPanel cards={detailCards} specs={product.specs} faqs={product.faqs} reviewCount={reviewCount} />

      {productRecommendations.length ? (
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-4 px-1">
            <h2 className="text-lg font-bold text-omd-brown">You May Also Like</h2>
            <Link href="/shop" className="text-sm font-bold text-omd-saffron hover:text-omd-brown">View all -&gt;</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {productRecommendations.slice(0, 6).map((recommendation) => (
              <CompactRecommendationCard key={recommendation.item.id} item={recommendation.item} />
            ))}
          </div>
        </section>
      ) : null}

      {relatedServices.length ? (
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-4 px-1">
            <h2 className="text-lg font-bold text-omd-brown">Related Services</h2>
            <Link href="/services" className="text-sm font-bold text-omd-saffron hover:text-omd-brown">View all -&gt;</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.slice(0, 3).map((recommendation) => (
              <CompactRecommendationCard key={recommendation.item.id} item={recommendation.item} />
            ))}
          </div>
        </section>
      ) : null}

      <TrustBand />
    </article>
  );
}