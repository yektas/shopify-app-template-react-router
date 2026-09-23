import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useEffect } from "react";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

type ClarityClient = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityClient;
  }
}

const CLARITY_SCRIPT_ID = "microsoft-clarity-script";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // oxlint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    // The Clarity project ID is public and only enables tracking when configured.
    // oxlint-disable-next-line no-undef
    clarityProjectId: process.env.CLARITY_PROJECT_ID || "",
  };
};

export default function App() {
  const { apiKey, clarityProjectId } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (!clarityProjectId || document.getElementById(CLARITY_SCRIPT_ID)) return;

    if (!window.clarity) {
      const queue: unknown[][] = [];
      window.clarity = Object.assign(
        (...args: unknown[]) => {
          queue.push(args);
        },
        { q: queue },
      );
    }

    const script = document.createElement("script");
    script.id = CLARITY_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(
      clarityProjectId,
    )}`;
    document.head.appendChild(script);
  }, [clarityProjectId]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
