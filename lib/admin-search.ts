import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { statusLabel } from "@/lib/status-labels";

type AdminSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
};

export type AdminSearchGroup = {
  key: string;
  title: string;
  description: string;
  items: AdminSearchResult[];
};

const take = 8;

function contains(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function compactGroups(groups: AdminSearchGroup[]) {
  return groups.filter((group) => group.items.length > 0);
}

export async function searchAdmin(query: string): Promise<AdminSearchGroup[]> {
  const q = query.trim();
  if (!q) return [];

  const tenantId = await getOmdTenantId();
  const [
    products,
    services,
    categories,
    customers,
    orders,
    payments,
    requests,
    documents,
    assignments,
    serviceBookings,
    asthiApplications,
    kundliOrders,
    memberships,
    tags,
    festivals,
    promotions,
    capacitySlots
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId,
        type: { not: "SERVICE" },
        OR: [
          { title: contains(q) },
          { slug: contains(q) },
          { description: contains(q) },
          { shortDescription: contains(q) },
          { category: { name: contains(q) } },
          { variants: { some: { sku: contains(q) } } }
        ]
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take
    }),
    prisma.product.findMany({
      where: {
        tenantId,
        type: "SERVICE",
        OR: [
          { title: contains(q) },
          { slug: contains(q) },
          { description: contains(q) },
          { shortDescription: contains(q) },
          { category: { name: contains(q) } }
        ]
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take
    }),
    prisma.category.findMany({
      where: {
        tenantId,
        OR: [{ name: contains(q) }, { slug: contains(q) }, { description: contains(q) }, { parent: { name: contains(q) } }]
      },
      include: { parent: { select: { name: true } }, _count: { select: { products: true, children: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take
    }),
    prisma.user.findMany({
      where: {
        tenantId,
        OR: [{ name: contains(q) }, { email: contains(q) }, { phone: contains(q) }]
      },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        OR: [
          { orderNumber: contains(q) },
          { customerName: contains(q) },
          { customerEmail: contains(q) },
          { customerPhone: contains(q) },
          { courierName: contains(q) },
          { trackingNumber: contains(q) },
          { invoiceNumber: contains(q) }
        ]
      },
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.paymentAttempt.findMany({
      where: {
        tenantId,
        OR: [
          { providerOrderId: contains(q) },
          { providerPaymentId: contains(q) },
          { order: { orderNumber: contains(q) } },
          { order: { customerName: contains(q) } },
          { order: { customerEmail: contains(q) } }
        ]
      },
      include: { order: { select: { id: true, orderNumber: true, customerName: true } } },
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.orderRequest.findMany({
      where: {
        tenantId,
        OR: [
          { requestType: contains(q) },
          { reason: contains(q) },
          { customerNote: contains(q) },
          { adminDecisionNote: contains(q) },
          { order: { orderNumber: contains(q) } },
          { order: { customerName: contains(q) } }
        ]
      },
      include: { order: { select: { id: true, orderNumber: true, customerName: true } } },
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.operationalDocument.findMany({
      where: {
        tenantId,
        OR: [
          { title: contains(q) },
          { ownerId: contains(q) },
          { documentType: contains(q) },
          { fileName: contains(q) },
          { fileUrl: contains(q) },
          { storageKey: contains(q) }
        ]
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take
    }),
    prisma.assignment.findMany({
      where: {
        tenantId,
        OR: [
          { workType: contains(q) },
          { workId: contains(q) },
          { assignmentLabel: contains(q) },
          { assignedRole: contains(q) },
          { internalNote: contains(q) },
          { customerVisibleNote: contains(q) }
        ]
      },
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take
    }),
    prisma.serviceBooking.findMany({
      where: {
        tenantId,
        OR: [
          { bookingNo: contains(q) },
          { customerName: contains(q) },
          { customerEmail: contains(q) },
          { customerPhone: contains(q) },
          { locationText: contains(q) },
          { service: { title: contains(q) } }
        ]
      },
      include: { service: { select: { title: true } }, variant: { select: { title: true, sku: true } } },
      orderBy: { updatedAt: "desc" },
      take
    }),
    prisma.asthiApplication.findMany({
      where: {
        tenantId,
        OR: [
          { applicationNo: contains(q) },
          { applicantName: contains(q) },
          { applicantEmail: contains(q) },
          { applicantPhone: contains(q) },
          { preferredLocation: contains(q) },
          { deceasedName: contains(q) }
        ]
      },
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.kundliOrder.findMany({
      where: {
        tenantId,
        OR: [
          { orderNo: contains(q) },
          { applicantName: contains(q) },
          { applicantEmail: contains(q) },
          { applicantPhone: contains(q) },
          { birthName: contains(q) },
          { placeOfBirth: contains(q) }
        ]
      },
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.membershipPlan.findMany({
      where: {
        tenantId,
        OR: [{ name: contains(q) }, { slug: contains(q) }, { description: contains(q) }]
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take
    }),
    prisma.tag.findMany({
      where: {
        tenantId,
        OR: [{ name: contains(q) }, { slug: contains(q) }, { type: contains(q) }, { description: contains(q) }, { aliases: { some: { value: contains(q) } } }]
      },
      include: { aliases: { take: 3 } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take
    }),
    prisma.festivalCampaign.findMany({
      where: {
        tenantId,
        OR: [{ title: contains(q) }, { slug: contains(q) }, { shortDescription: contains(q) }, { longDescription: contains(q) }]
      },
      orderBy: [{ priority: "desc" }, { startDate: "desc" }],
      take
    }),
    prisma.promotionPlacement.findMany({
      where: {
        tenantId,
        OR: [{ title: contains(q) }, { description: contains(q) }, { placementKey: contains(q) }, { surface: contains(q) }, { targetType: contains(q) }]
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take
    }),
    prisma.serviceCapacitySlot.findMany({
      where: {
        tenantId,
        OR: [{ title: contains(q) }, { serviceType: contains(q) }, { notes: contains(q) }]
      },
      orderBy: [{ date: "asc" }, { title: "asc" }],
      take
    })
  ]);

  return compactGroups([
    {
      key: "products",
      title: "Products",
      description: "Physical, digital, membership and kit catalog records.",
      items: products.map((product) => ({
        id: product.id,
        title: product.title,
        subtitle: `${product.category?.name ?? "Uncategorized"} - ${statusLabel(product.status)}`,
        href: `/admin/products/${product.id}/edit`,
        badge: product.type
      }))
    },
    {
      key: "services",
      title: "Services",
      description: "Service catalog records stored in the commerce catalog.",
      items: services.map((service) => ({
        id: service.id,
        title: service.title,
        subtitle: `${service.category?.name ?? "Uncategorized"} - ${statusLabel(service.status)}`,
        href: `/admin/products/${service.id}/edit`,
        badge: service.type
      }))
    },
    {
      key: "categories",
      title: "Categories",
      description: "Parent categories and subcategories.",
      items: categories.map((category) => ({
        id: category.id,
        title: category.name,
        subtitle: `${category.parent?.name ? `${category.parent.name} / ` : ""}${category.slug} - ${category._count.products} product(s), ${category._count.children} child category(s)`,
        href: `/admin/categories/${category.slug}/edit`,
        badge: statusLabel(category.status)
      }))
    },
    {
      key: "customers",
      title: "Customers",
      description: "Customer accounts and profile records.",
      items: customers.map((customer) => ({
        id: customer.id,
        title: customer.name ?? customer.email ?? customer.phone ?? "Unnamed customer",
        subtitle: `${customer.email ?? customer.phone ?? "No contact"} - ${customer._count.orders} order(s)`,
        href: `/admin/customers/${customer.id}`,
        badge: statusLabel(customer.status)
      }))
    },
    {
      key: "orders",
      title: "Orders",
      description: "Order lifecycle, fulfilment and invoice records.",
      items: orders.map((order) => ({
        id: order.id,
        title: order.orderNumber,
        subtitle: `${order.customerName} - ${statusLabel(order.status)} - Mock Payment ${statusLabel(order.paymentStatus)}`,
        href: `/admin/orders/${order.id}`,
        badge: statusLabel(order.fulfillmentStatus)
      }))
    },
    {
      key: "payments",
      title: "Mock Payments",
      description: "Payment attempts and provider-style identifiers.",
      items: payments.map((payment) => ({
        id: payment.id,
        title: payment.providerOrderId,
        subtitle: `${payment.order.orderNumber} - ${payment.order.customerName}`,
        href: `/admin/orders/${payment.order.id}`,
        badge: statusLabel(payment.status)
      }))
    },
    {
      key: "requests",
      title: "Order Requests",
      description: "Cancellation, return and refund request shell.",
      items: requests.map((request) => ({
        id: request.id,
        title: `${statusLabel(request.requestType)} request`,
        subtitle: `${request.order.orderNumber} - ${request.order.customerName} - ${request.reason}`,
        href: `/admin/requests?q=${encodeURIComponent(request.order.orderNumber)}`,
        badge: statusLabel(request.status)
      }))
    },
    {
      key: "documents",
      title: "Documents",
      description: "Operational document, proof and report placeholders.",
      items: documents.map((document) => ({
        id: document.id,
        title: document.title,
        subtitle: `${statusLabel(document.ownerType)} - ${document.ownerId}`,
        href: `/admin/documents?q=${encodeURIComponent(document.ownerId)}`,
        badge: statusLabel(document.status)
      }))
    },
    {
      key: "assignments",
      title: "Assignments",
      description: "Internal work assignments and due work.",
      items: assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.assignmentLabel ?? `${statusLabel(assignment.workType)} assignment`,
        subtitle: `${assignment.assignedUser?.name ?? assignment.assignedUser?.email ?? assignment.assignedRole ?? "Unassigned"} - ${assignment.workId}`,
        href: `/admin/assignments?q=${encodeURIComponent(assignment.workId)}`,
        badge: statusLabel(assignment.status)
      }))
    },
    {
      key: "service-bookings",
      title: "Service Bookings",
      description: "Generic Puja and general service booking records.",
      items: serviceBookings.map((booking) => ({
        id: booking.id,
        title: booking.bookingNo ?? booking.id,
        subtitle: `${booking.service.title} - ${booking.customerName} - Mock Payment ${statusLabel(booking.paymentStatus)}`,
        href: `/admin/service-bookings/${booking.bookingNo ?? booking.id}`,
        badge: statusLabel(booking.status)
      }))
    },
    {
      key: "asthi",
      title: "Asthi Applications",
      description: "Asthi Visarjan application and ritual workflow records.",
      items: asthiApplications.map((application) => ({
        id: application.id,
        title: application.applicationNo ?? application.id,
        subtitle: `${application.applicantName} - ${application.preferredLocation ?? "Location pending"}`,
        href: `/admin/asthi/${application.applicationNo ?? application.id}`,
        badge: statusLabel(application.status)
      }))
    },
    {
      key: "kundli",
      title: "Kundli Orders",
      description: "Kundli package order and report workflow records.",
      items: kundliOrders.map((order) => ({
        id: order.id,
        title: order.orderNo ?? order.id,
        subtitle: `${order.applicantName} - ${order.applicantEmail}`,
        href: `/admin/kundli/${order.orderNo ?? order.id}`,
        badge: statusLabel(order.status)
      }))
    },
    {
      key: "memberships",
      title: "Membership Plans",
      description: "Membership plan records and benefits.",
      items: memberships.map((plan) => ({
        id: plan.id,
        title: plan.name,
        subtitle: `${plan.slug} - ${plan.durationDays} days`,
        href: `/admin/memberships`,
        badge: statusLabel(plan.status)
      }))
    },
    {
      key: "tags",
      title: "Tags",
      description: "Context graph tags and aliases.",
      items: tags.map((tag) => ({
        id: tag.id,
        title: tag.name,
        subtitle: [tag.slug, ...tag.aliases.map((alias) => alias.value)].join(" - "),
        href: `/admin/tags/${tag.id}/edit`,
        badge: statusLabel(tag.type)
      }))
    },
    {
      key: "festivals",
      title: "Festival Campaigns",
      description: "Merchandising campaigns and linked festival surfaces.",
      items: festivals.map((festival) => ({
        id: festival.id,
        title: festival.title,
        subtitle: `${festival.slug} - ${festival.startDate.toLocaleDateString("en-IN")} to ${festival.endDate.toLocaleDateString("en-IN")}`,
        href: `/admin/festivals/${festival.id}/edit`,
        badge: statusLabel(festival.status)
      }))
    },
    {
      key: "promotions",
      title: "Promotions",
      description: "Homepage and storefront placement records.",
      items: promotions.map((promotion) => ({
        id: promotion.id,
        title: promotion.title,
        subtitle: `${promotion.placementKey} - ${promotion.surface}`,
        href: `/admin/promotions/${promotion.id}/edit`,
        badge: statusLabel(promotion.status)
      }))
    },
    {
      key: "capacity",
      title: "Capacity Slots",
      description: "Service capacity planning slots.",
      items: capacitySlots.map((slot) => ({
        id: slot.id,
        title: slot.title,
        subtitle: `${statusLabel(slot.serviceType)} - ${slot.date.toLocaleDateString("en-IN")} - ${slot.capacityConfirmed}/${slot.capacityTotal} confirmed`,
        href: `/admin/capacity?q=${encodeURIComponent(slot.title)}`,
        badge: statusLabel(slot.status)
      }))
    }
  ]);
}
