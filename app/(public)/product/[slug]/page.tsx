import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogCard } from "@/components/catalog-card";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { ProductMediaGallery } from "@/components/product-media-gallery";
import { PremiumProductBuyBox } from "@/components/premium-product-buy-box";
import { TagChips } from "@/components/tag-chips";
import { getCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
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

function stockLabel(stock: { available: number; status: string } | null | undefined) {
  if (!stock) return "Stock Setup Pending";
  if (stock.status === "OUT_OF_STOCK") return "Out of Stock";
  if (stock.status === "LOW_STOCK") return `Only ${stock.available} Left`;
  return `${stock.available} In Stock`;
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
      {
        title: "Overview",
        body: `${product.title} is a curated kit designed to make devotional preparation easier and more complete.`
      },
      {
        title: "What's Included",
        body: "Kit components are managed from admin and snapshot into orders during purchase.",
        items: componentItems
      },
      {
        title: "Ritual Suitability",
        body: "Best suited for devotees who want a ready-to-use selection rather than shopping individual components."
      },
      {
        title: "Kit Benefits",
        body: "Simplifies purchase, supports stock-aware checkout, and gives admin teams a clear fulfilment bundle."
      }
    ];
  }

  if (product.type === "SERVICE") {
    if (isAsthiOffering(product)) {
      return [
        {
          title: "Overview",
          body: "A guided Asthi Visarjan service journey with respectful support, application tracking, and mock payment in this demo phase."
        },
        {
          title: "Required Documents",
          body: "The current MVP supports document metadata placeholders for death certificate, applicant identity proof, relation proof, and other supporting documents."
        },
        {
          title: "How It Works",
          body: "Apply, share required details, upload document placeholders, complete review and mock payment, then track scheduling, ritual completion, proof, and status updates."
        },
        {
          title: "Transparent Tracking",
          body: "Application status, payment status, document status, and activity timeline are visible after the application is created."
        }
      ];
    }

    return [
      { title: "Overview", body: "A service offering designed for guided devotional support through the OMDivyaDarshan commerce engine." },
      { title: "What's Included", body: "Service details, payment review, and order tracking are available in the customer journey." },
      { title: "How It Works", body: "Choose the service, complete checkout with mock payment, and follow service status through the customer order experience." },
      { title: "Support Note", body: "Capacity, scheduling, and fulfilment workflows are intentionally deferred for a later operational phase." }
    ];
  }

  if (product.type === "MEMBERSHIP") {
    return [
      { title: "Membership Benefits", body: "Monthly membership supports ongoing devotional participation, priority support, and future member-specific commerce benefits." },
      { title: "Monthly Participation", body: "Membership offerings are sold as product variants and activate after successful mock payment." },
      { title: "Activation Note", body: "Membership subscription visibility appears on the customer dashboard and admin membership screen after successful purchase." },
      { title: "Renewal Boundary", body: "Renewal automation and recurring billing are intentionally deferred." }
    ];
  }

  if (product.type === "DIGITAL") {
    return [
      { title: "What You Receive", body: "A digital offering processed through the same checkout and mock payment experience as other products." },
      { title: "Delivery Timeline", body: "Digital generation and delivery automation are deferred; this phase validates purchase and order visibility." },
      { title: "Required Information", body: "Any required personal or spiritual details should be captured in a future dedicated workflow." },
      { title: "Privacy Note", body: "Production digital workflows should include stronger privacy handling and secure delivery controls." }
    ];
  }

  return [
    { title: "Overview", body: `${product.title} is part of the ${product.category?.name ?? "OMDivyaDarshan"} catalog, prepared for a premium devotional shopping experience.` },
    { title: "Product Benefits", body: "Curated for devotional quality, easy discovery, and clear checkout with stock-aware purchase behavior." },
    { title: "How to Use", body: "Use according to your family practice, pujari guidance, or personal daily devotional routine." },
    { title: "Shipping & Returns", body: "Fulfilment and courier integrations are placeholders in this phase; admin can still process mock order fulfilment." },
    { title: "Authenticity & Quality", body: "Products are presented with a ritual-ready quality promise and transparent order tracking." }
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

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#ead7bf] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-omd-brown">{title}</h2>
      <div className="mt-4">{children}</div>
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
    getEntityTags(tenantId, product.type === "SERVICE" ? "SERVICE" : "PRODUCT", product.id)
    ,
    getRelatedProducts({ tenantId, currentProductId: product.id, categoryId: product.categoryId, currentType: product.type, limit: 4 }),
    getRelatedServices({ tenantId, targetType: product.type === "SERVICE" ? "SERVICE" : "PRODUCT", targetId: product.id, categoryId: product.categoryId, limit: 3 }),
    product.type === "SERVICE" ? getRequiredSamagri({ tenantId, serviceId: product.id, limit: 4 }) : Promise.resolve([])
  ]);

  const lowestVariant = product.variants[0];
  const price = lowestVariant?.price ?? product.basePrice;
  const mrp = lowestVariant?.mrp ?? product.mrp;
  const discount = discountPercent(price, mrp);
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
    : [
        {
          id: "",
          title: "Default Option",
          sku: null,
          price: Number(price ?? 0),
          mrp: mrp ? Number(mrp) : null,
          stockLabel: availability,
          disabled: false
        }
      ];
  const primaryDetail = detailCards[0] ?? {
    title: "Description",
    body: product.description ?? product.shortDescription ?? "Details coming soon.",
    items: []
  };
  const whatInside = detailCards.find((card) => card.title.toLowerCase().includes("inside") || card.title.toLowerCase().includes("included"));
  const howToUse = detailCards.find((card) => card.title.toLowerCase().includes("use"));
  const deliveryResult = !requestedPincode
    ? ({ kind: "none" } as const)
    : deliveryZone
      ? deliveryZone.serviceable
        ? ({ kind: "serviceable", pincode: requestedPincode, city: deliveryZone.city, state: deliveryZone.state, estimatedDays: deliveryZone.estimatedDays } as const)
        : ({ kind: "unserviceable", pincode: requestedPincode, city: deliveryZone.city, state: deliveryZone.state } as const)
      : ({ kind: "unknown", pincode: requestedPincode } as const);
  const sku = lowestVariant?.sku ?? "OMD-PRODUCT";
  const galleryBadges = ["Featured", discount ? `${discount}% OFF` : null].filter((item): item is string => Boolean(item));
  const assignedTags = tagRelations.map((relation) => relation.tag).filter((tag) => tag.status === "ACTIVE");
  const productRecommendations = product.type === "SERVICE" ? requiredSamagri : relatedProducts;
  const productRecommendationTitle = product.type === "SERVICE" ? "Required Samagri" : "Related Products";
  const productRecommendationSubtitle = product.type === "SERVICE" ? "Useful products and kits connected to this seva context." : "Products connected through shared tags, category, and festival context.";
  const visibleContentBlocks = product.contentBlocks.filter((block) => block.body || contentItems(block.itemsJson).length);
  const reviewItems = product.reviews.slice(0, 4);

  return (
    <article className="grid gap-8 pb-2">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,680px)_minmax(360px,440px)] xl:items-start xl:justify-center">
        <ProductMediaGallery
          media={galleryMedia}
          title={product.title}
          category={product.category?.name}
          badges={galleryBadges}
          wishlistActive={Boolean(wishlistItem)}
        />

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

      <section className="grid gap-4 rounded-2xl border border-[#ead7bf] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Product Context</p>
            <h2 className="mt-1 text-xl font-semibold text-omd-brown">{product.title}</h2>
          </div>
          {product.ratingsEnabled ? <StarRating rating={averageRating} count={reviewCount} /> : null}
        </div>
        <p className="max-w-4xl text-sm leading-7 text-omd-muted">{primaryDetail.body}</p>
        {primaryDetail.items?.length ? (
          <ul className="grid gap-2 pl-5 text-sm leading-6 text-omd-muted sm:grid-cols-2">
            {primaryDetail.items.map((item) => <li key={item} className="list-disc">{item}</li>)}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <TagChips tags={assignedTags} />
          <span className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1 text-xs font-semibold text-omd-brown">{availability}</span>
          <span className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1 text-xs font-semibold text-omd-brown">SKU: {sku}</span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-5">
          {visibleContentBlocks.map((block) => {
            const items = contentItems(block.itemsJson);
            return (
              <DetailSection key={block.id} title={block.title}>
                <p className="text-sm leading-7 text-omd-muted">{block.body}</p>
                {items.length ? (
                  <ul className="mt-3 grid gap-2 pl-5 text-sm leading-6 text-omd-muted">
                    {items.map((item) => <li key={item} className="list-disc">{item}</li>)}
                  </ul>
                ) : null}
              </DetailSection>
            );
          })}
          {!visibleContentBlocks.length && whatInside && whatInside !== primaryDetail ? (
            <DetailSection title={whatInside.title}>
              <p className="text-sm leading-7 text-omd-muted">{whatInside.body}</p>
              {whatInside.items?.length ? (
                <ul className="mt-3 grid gap-2 pl-5 text-sm leading-6 text-omd-muted">
                  {whatInside.items.map((item) => <li key={item} className="list-disc">{item}</li>)}
                </ul>
              ) : null}
            </DetailSection>
          ) : null}
          {!visibleContentBlocks.length && howToUse && howToUse !== primaryDetail ? (
            <DetailSection title={howToUse.title}>
              <p className="text-sm leading-7 text-omd-muted">{howToUse.body}</p>
            </DetailSection>
          ) : null}
        </div>

        <div className="grid gap-5 content-start">
          {product.specs.length ? (
            <DetailSection title="Product Details">
              <div className="grid gap-3 text-sm">
                {product.specs.map((spec) => (
                  <div key={spec.id} className="grid grid-cols-[120px_1fr] gap-4 border-b border-omd-sand pb-3 last:border-b-0 last:pb-0">
                    <span className="font-semibold text-omd-brown">{spec.label}</span>
                    <span className="text-omd-muted">{spec.value}</span>
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}

          {product.faqs.length ? (
            <DetailSection title="FAQs">
              <div className="grid gap-4">
                {product.faqs.map((faq) => (
                  <div key={faq.id}>
                    <h3 className="text-sm font-semibold text-omd-brown">{faq.question}</h3>
                    <p className="mt-1 text-sm leading-6 text-omd-muted">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}
        </div>
      </section>

      {product.reviewsEnabled && reviewItems.length ? (
        <DetailSection title={`Reviews (${reviewCount})`}>
          <div className="grid gap-4 md:grid-cols-2">
            {reviewItems.map((review) => (
              <article key={review.id} className="rounded-xl border border-omd-sand bg-omd-ivory/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-omd-brown">{review.customerName ?? "OMD Customer"}</p>
                  <p className="text-sm font-semibold text-omd-saffron">{review.rating}/5</p>
                </div>
                {review.title ? <h3 className="mt-3 text-sm font-semibold text-omd-brown">{review.title}</h3> : null}
                {review.body ? <p className="mt-2 text-sm leading-6 text-omd-muted">{review.body}</p> : null}
              </article>
            ))}
          </div>
        </DetailSection>
      ) : null}

      {productRecommendations.length ? (
        <section className="grid gap-4">
          <div className="px-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Recommended</p>
            <h2 className="mt-1 text-lg font-semibold text-omd-brown">{productRecommendationTitle}</h2>
            <p className="mt-1 text-sm text-omd-muted">{productRecommendationSubtitle}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productRecommendations.map((recommendation) => (
              <div key={recommendation.item.id} className="grid gap-3">
                <CatalogCard item={recommendation.item} stock={recommendation.stock} />
                <div className="flex flex-wrap gap-2">
                  {recommendation.contexts.slice(0, 2).map((context) => (
                    <span key={context} className="rounded-full border border-omd-sand bg-white px-3 py-1 text-xs font-semibold text-omd-brown">
                      {context}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {relatedServices.length ? (
        <section className="grid gap-4">
          <div className="px-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Guided Seva</p>
            <h2 className="mt-1 text-lg font-semibold text-omd-brown">Related Services</h2>
            <p className="mt-1 text-sm text-omd-muted">Service offerings connected through shared ritual, place, deity, or festival context.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.map((recommendation) => (
              <div key={recommendation.item.id} className="grid gap-3">
                <CatalogCard
                  item={recommendation.item}
                  href={recommendation.item.slug === "asthi-visarjan-assistance" ? "/services/asthi-visarjan" : `/product/${recommendation.item.slug}`}
                />
                <div className="flex flex-wrap gap-2">
                  {recommendation.contexts.slice(0, 2).map((context) => (
                    <span key={context} className="rounded-full border border-omd-sand bg-white px-3 py-1 text-xs font-semibold text-omd-brown">
                      {context}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 rounded-lg border border-[#ead7bf] bg-white px-5 py-5 shadow-sm md:grid-cols-4">
        {[
          ["100% Authentic", "Ritual-ready products sourced with purity and devotion."],
          ["Secure Payments", "Safe mock payments with multiple options."],
          ["Guided Services", "Expert-led seva and rituals with full guidance."],
          ["Devotional Quality", "Crafted with devotion and care for your spiritual journey."]
        ].map(([title, description]) => (
          <div key={title} className="grid grid-cols-[44px_1fr] gap-3 border-[#ead7bf] md:border-r md:last:border-r-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-omd-gold/40 text-[10px] text-omd-saffron">OMD</span>
            <span>
              <span className="block text-sm font-semibold text-omd-brown">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-omd-muted">{description}</span>
            </span>
          </div>
        ))}
      </section>
    </article>
  );

}
