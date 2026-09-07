"use client";

import { RouteError } from "@/components/route-error";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} destination="/admin" destinationLabel="Go to admin overview" />;
}
