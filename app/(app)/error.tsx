"use client";

import { RouteError } from "@/components/route-error";

export default function CustomerError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} destination="/dashboard" destinationLabel="Go to dashboard" />;
}
