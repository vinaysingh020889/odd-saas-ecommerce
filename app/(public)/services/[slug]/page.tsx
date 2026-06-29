import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { getRemainingCapacity } from "@/lib/service-capacity";
import { getRelatedProducts, getRelatedServices, getRequiredSamagri } from "@/lib/recommendations";
import { createServiceBookingAction } from "@/lib/service-booking-actions";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { CatalogCard } from "@/components/catalog-card";
import { TagChips } from "@/components/tag-chips";
import { BreadcrumbHeader, Panel, StatusBadge } from "@/components/ui";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "asthi-visarjan" || slug === "asthi-visarjan-assistance") redirect("/services/asthi-visarjan");

  const tenantId = await getOmdTenantId();
  const service = await prisma.product.findFirst({
    where: { tenantId, slug, type: "SERVICE", status: "ACTIVE" },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
      specs: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
      faqs: { where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { question: "asc" }] },
      contentBlocks: { where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] },
      media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });

  if (!service) notFound();

  const [tags, slots, requiredSamagri, relatedProducts, relatedServices] = await Promise.all([
    prisma.tagRelation.findMany({
      where: { tenantId, targetType: "SERVICE", targetId: service.id, tag: { status: "ACTIVE" } },
      include: { tag: { select: { id: true, name: true, type: true } } },
      orderBy: [{ sortOrder: "asc" }, { tag: { name: "asc" } }]
    }),
    prisma.serviceCapacitySlot.findMany({
      where: {
        tenantId,
        status: { in: ["ACTIVE", "HELD"] },
        OR: [{ productId: service.id }, { serviceId: service.id }, { serviceType: "PUJA" }, { serviceType: "GENERAL_SERVICE" }],
        date: { gte: new Date() }
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 8
    }),
    getRequiredSamagri({ tenantId, serviceId: service.id, limit: 4 }),
    getRelatedProducts({ tenantId, currentProductId: service.id, currentType: "SERVICE", categoryId: service.categoryId, limit: 4 }),
    getRelatedServices({ tenantId, targetType: "SERVICE", targetId: service.id, categoryId: service.categoryId, limit: 3 })
  ]);

  const primaryImage = service.media[0]?.url ?? service.imageUrl;
  const defaultVariant = service.variants[0] ?? null;
  const defaultPrice = defaultVariant?.price ?? service.basePrice;

  return (
    <div className="grid gap-8">
      <CustomerEventBeacon
        eventType="SERVICE_DETAIL_VIEWED"
        entityType="SERVICE"
        entityId={service.id}
        entitySlug={service.slug}
        metadata={{ title: service.title, categoryId: service.categoryId, categoryName: service.category?.name ?? null }}
      />
      <BreadcrumbHeader items={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, { label: service.title }]} />

      <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
        <Panel>
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="overflow-hidden rounded-lg border border-omd-sand bg-omd-ivory">
              {primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage} alt={service.title} className="h-72 w-full object-cover" />
              ) : (
                <div className="grid h-72 place-items-center px-6 text-center text-sm font-semibold text-omd-muted">Service image placeholder</div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="ops">{service.category?.name ?? "Service"}</StatusBadge>
                <StatusBadge tone="neutral">Manual operations shell</StatusBadge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-omd-brown md:text-4xl">{service.title}</h1>
              <p className="mt-3 text-sm leading-7 text-omd-muted">{service.shortDescription ?? service.description}</p>
              <p className="mt-5 text-3xl font-semibold text-omd-brown">{formatMoney(defaultPrice, service.currency)}</p>
              <p className="mt-1 text-sm text-omd-muted">Mock payment/manual review only. No real gateway is connected.</p>
              <div className="mt-4">
                <TagChips tags={tags.map((relation) => relation.tag)} label="Service context" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="h-fit lg:sticky lg:top-20">
          <h2 className="text-xl font-semibold text-omd-brown">Start Booking</h2>
          <form action={createServiceBookingAction} className="mt-5 grid gap-3">
            <input type="hidden" name="serviceSlug" value={service.slug} />
            <label className="grid gap-1 text-sm font-semibold text-omd-brown">
              Package
              <select name="variantId" defaultValue={defaultVariant?.id ?? ""} className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal">
                {service.variants.length === 0 ? <option value="">Default package</option> : null}
                {service.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title ?? variant.sku ?? "Package"} - {formatMoney(variant.price ?? service.basePrice, service.currency)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-omd-brown">
                Preferred date
                <input name="preferredDate" type="date" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-omd-brown">
                Preferred time
                <input name="preferredTime" placeholder="Morning / 8:00 AM" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-omd-brown">
              Capacity slot
              <select name="slotId" defaultValue="" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal">
                <option value="">Manual review / no slot</option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.title} - {slot.date.toLocaleDateString("en-IN")} {slot.startTime ?? ""} ({getRemainingCapacity(slot)} left)
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-omd-brown">
              Place / location
              <input name="locationText" placeholder="Home, temple, online, city or place" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-omd-brown">
                Quantity
                <input name="quantity" type="number" min="1" defaultValue="1" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-omd-brown">
                Participants
                <input name="participantCount" type="number" min="1" defaultValue="1" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
              </label>
            </div>
            <textarea name="specialInstructions" rows={3} placeholder="Gotra, sankalp, family names, online/offline preference, or other notes" className="rounded-md border border-omd-sand px-3 py-2 text-sm" />
            <button className="rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
              Continue to Review
            </button>
          </form>
        </Panel>
      </section>

      {(service.contentBlocks.length || service.specs.length || service.faqs.length) ? (
        <Panel>
          <div className="grid gap-6 lg:grid-cols-3">
            {service.contentBlocks.map((block) => (
              <div key={block.id}>
                <h2 className="font-semibold text-omd-brown">{block.title}</h2>
                <p className="mt-2 text-sm leading-6 text-omd-muted">{block.body}</p>
              </div>
            ))}
            {service.specs.length ? (
              <div>
                <h2 className="font-semibold text-omd-brown">Service Details</h2>
                <div className="mt-2 grid gap-2 text-sm">
                  {service.specs.map((spec) => <p key={spec.id} className="text-omd-muted"><span className="font-semibold text-omd-brown">{spec.label}:</span> {spec.value}</p>)}
                </div>
              </div>
            ) : null}
            {service.faqs.length ? (
              <div>
                <h2 className="font-semibold text-omd-brown">FAQs</h2>
                <div className="mt-2 grid gap-2 text-sm">
                  {service.faqs.slice(0, 3).map((faq) => <p key={faq.id} className="text-omd-muted"><span className="font-semibold text-omd-brown">{faq.question}</span><br />{faq.answer}</p>)}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {requiredSamagri.length || relatedProducts.length || relatedServices.length ? (
        <section className="grid gap-6">
          {requiredSamagri.length ? (
            <div>
              <h2 className="text-xl font-semibold text-omd-brown">Required Samagri</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {requiredSamagri.map((recommendation) => <CatalogCard key={recommendation.item.id} item={recommendation.item} stock={recommendation.stock} />)}
              </div>
            </div>
          ) : null}
          {relatedProducts.length ? (
            <div>
              <h2 className="text-xl font-semibold text-omd-brown">Useful Products</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {relatedProducts.map((recommendation) => <CatalogCard key={recommendation.item.id} item={recommendation.item} stock={recommendation.stock} />)}
              </div>
            </div>
          ) : null}
          {relatedServices.length ? (
            <div>
              <h2 className="text-xl font-semibold text-omd-brown">Related Services</h2>
              <div className="mt-4 grid gap-5 md:grid-cols-3">
                {relatedServices.map((recommendation) => (
                  <CatalogCard key={recommendation.item.id} item={recommendation.item} href={`/services/${recommendation.item.slug}`} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
