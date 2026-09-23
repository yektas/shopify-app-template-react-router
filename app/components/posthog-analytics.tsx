import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { posthog } from "posthog-js";

import type { PostHogConfig } from "../lib/posthog";

export function PostHogAnalytics({ config }: { config: PostHogConfig | null }) {
  const apiKey = config?.apiKey;
  const apiHost = config?.apiHost;
  const shopDomain = config?.shop.domain;
  const shopName = config?.shop.name;
  const ready = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (!apiKey || !apiHost) return;

    if (!ready.current) {
      posthog.init(apiKey, {
        api_host: apiHost,
        capture_pageview: false,
        person_profiles: "identified_only",
      });
      ready.current = true;
    }

    if (shopDomain) {
      if (posthog.get_distinct_id() !== shopDomain) {
        posthog.reset();
      }
      posthog.identify(shopDomain, { shop_name: shopName });
    }
  }, [apiKey, apiHost, shopDomain, shopName]);

  useEffect(() => {
    if (!ready.current) return;
    posthog.capture("$pageview");
  }, [location.pathname, location.search]);

  return null;
}
