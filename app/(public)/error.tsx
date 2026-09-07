"use client";

import { RouteError } from "@/components/route-error";

export default function PublicError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} destination="/" destinationLabel="Go to homepage" />;
}
