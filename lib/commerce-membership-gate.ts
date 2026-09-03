import { redirect } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveMembershipForUser } from "@/lib/membership";

export const COMMERCE_MEMBERSHIP_MESSAGE = "Activate your complimentary OMD Membership to continue with your order.";

export function safeCommerceReturnPath(value: string | null | undefined, fallback = "/checkout") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function commerceMembershipGateDestination(
  user: Pick<AuthenticatedUser, "id"> | null,
  hasActiveMembership: boolean,
  returnTo = "/checkout"
) {
  const safeReturnTo = safeCommerceReturnPath(returnTo);
  if (!user) return `/login?redirectTo=${encodeURIComponent(safeReturnTo)}`;
  if (!hasActiveMembership) {
    return `/membership?membershipRequired=1&returnTo=${encodeURIComponent(safeReturnTo)}`;
  }
  return null;
}

export async function requireCommerceMembership(returnTo = "/checkout") {
  const user = await getCurrentUser();
  const membership = user ? await getActiveMembershipForUser(user.id) : null;
  const destination = commerceMembershipGateDestination(user, Boolean(membership), returnTo);
  if (destination) redirect(destination);
  return { user: user!, membership: membership! };
}
