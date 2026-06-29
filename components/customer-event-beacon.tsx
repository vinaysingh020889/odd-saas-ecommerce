"use client";

import { useEffect } from "react";
import type { CustomerEventEntityType, CustomerEventType } from "@/lib/customer-events";

type CustomerEventBeaconProps = {
  eventType: CustomerEventType;
  entityType?: CustomerEventEntityType;
  entityId?: string;
  entitySlug?: string;
  metadata?: Record<string, unknown>;
};

export function CustomerEventBeacon({ eventType, entityType, entityId, entitySlug, metadata }: CustomerEventBeaconProps) {
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/customer-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          entityType,
          entityId,
          entitySlug,
          metadata,
          sourcePath: window.location.pathname + window.location.search
        }),
        signal: controller.signal
      }).catch(() => {
        // Internal analytics must never interrupt browsing. Consent controls can be added here later.
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [eventType, entityType, entityId, entitySlug, metadata]);

  return null;
}
