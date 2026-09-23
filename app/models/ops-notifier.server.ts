import { createHash, createHmac, randomUUID } from "node:crypto";
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import db from "../db.server";

type OpsEventType = "app.installed" | "app.uninstalled";

export interface ShopProfile {
  name?: string | null;
  ownerName?: string | null;
  email?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  ianaTimezone?: string | null;
  shopifyPlan?: string | null;
}

interface OpsEvent {
  id: string;
  app: string;
  type: OpsEventType;
  shop: string;
  occurredAt: string;
  shopProfile?: ShopProfile;
}

type AdminGraphqlClient = Pick<AdminApiContext, "graphql">;

export async function markAppInstalled(shop: string): Promise<boolean> {
  const installedAt = new Date();
  try {
    await db.opsInstallation.create({ data: { shop, installedAt } });
    return true;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  const reinstalled = await db.opsInstallation.updateMany({
    where: { shop, uninstalledAt: { not: null } },
    data: { installedAt, uninstalledAt: null },
  });
  return reinstalled.count > 0;
}

export async function markAppUninstalled(shop: string): Promise<void> {
  const uninstalledAt = new Date();
  await db.opsInstallation.upsert({
    where: { shop },
    create: { shop, uninstalledAt },
    update: { uninstalledAt },
  });
}

export async function notifyAppInstalled(
  shop: string,
  accessToken: string,
  admin?: AdminGraphqlClient,
): Promise<void> {
  const app = configuredAppId();
  if (!app || !notifierConfigured()) return;

  let shopProfile: ShopProfile | undefined;
  if (admin) {
    try {
      shopProfile = await queryShopProfile(admin);
    } catch (error) {
      console.error("Shop profile enrichment failed", {
        shop,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  await sendOpsEvent({
    id: lifecycleEventId(app, "app.installed", shop, accessToken),
    app,
    type: "app.installed",
    shop,
    occurredAt: new Date().toISOString(),
    ...(shopProfile ? { shopProfile } : {}),
  });
}

export async function notifyAppUninstalled(
  shop: string,
  webhookId: string | null,
  payload: unknown,
): Promise<void> {
  const app = configuredAppId();
  if (!app || !notifierConfigured()) return;

  const shopProfile = shopProfileFromUninstallPayload(payload);
  await sendOpsEvent({
    id: lifecycleEventId(
      app,
      "app.uninstalled",
      shop,
      webhookId ?? randomUUID(),
    ),
    app,
    type: "app.uninstalled",
    shop,
    occurredAt: new Date().toISOString(),
    ...(shopProfile ? { shopProfile } : {}),
  });
}

export async function queryShopProfile(
  admin: AdminGraphqlClient,
): Promise<ShopProfile> {
  const response = await admin.graphql(`#graphql
    query OpsLifecycleShopProfile {
      shop {
        name
        shopOwnerName
        contactEmail
        shopAddress { countryCodeV2 }
        currencyCode
        ianaTimezone
        plan { publicDisplayName }
      }
    }
  `);
  if (!response.ok) {
    throw new Error(`Admin GraphQL returned HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    data?: {
      shop?: {
        name?: unknown;
        shopOwnerName?: unknown;
        contactEmail?: unknown;
        shopAddress?: { countryCodeV2?: unknown } | null;
        currencyCode?: unknown;
        ianaTimezone?: unknown;
        plan?: { publicDisplayName?: unknown } | null;
      } | null;
    };
    errors?: unknown;
  };
  if (body.errors || !body.data?.shop) {
    throw new Error("Admin GraphQL shop profile response was incomplete");
  }

  const shop = body.data.shop;
  return {
    name: nullableString(shop.name),
    ownerName: nullableString(shop.shopOwnerName),
    email: nullableString(shop.contactEmail),
    countryCode: nullableString(shop.shopAddress?.countryCodeV2),
    currencyCode: nullableString(shop.currencyCode),
    ianaTimezone: nullableString(shop.ianaTimezone),
    shopifyPlan: nullableString(shop.plan?.publicDisplayName),
  };
}

export function shopProfileFromUninstallPayload(
  payload: unknown,
): ShopProfile | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  return {
    name: nullableString(record.name),
    ownerName: nullableString(record.shop_owner),
    email: nullableString(record.email),
    countryCode: nullableString(record.country_code),
    currencyCode: nullableString(record.currency),
    ianaTimezone: nullableString(record.iana_timezone),
    shopifyPlan: nullableString(record.plan_display_name),
  };
}

export async function sendOpsEvent(
  event: OpsEvent,
): Promise<"sent" | "disabled" | "failed"> {
  const endpoint = process.env.OPS_NOTIFIER_URL?.trim();
  const secret = process.env.OPS_NOTIFIER_SECRET?.trim();
  if (!endpoint || !secret) return "disabled";

  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1_000));
  const signature = `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex")}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ops-App": event.app,
        "X-Ops-Signature": signature,
        "X-Ops-Timestamp": timestamp,
      },
      body,
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      throw new Error(`Ops notifier returned HTTP ${response.status}`);
    }
    return "sent";
  } catch (error) {
    console.error("Ops notification delivery failed", {
      app: event.app,
      eventId: event.id,
      type: event.type,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return "failed";
  }
}

function notifierConfigured(): boolean {
  return Boolean(
    process.env.OPS_NOTIFIER_URL?.trim() &&
      process.env.OPS_NOTIFIER_SECRET?.trim(),
  );
}

function configuredAppId(): string | undefined {
  const appId = process.env.OPS_NOTIFIER_APP_ID?.trim();
  return appId || undefined;
}

function lifecycleEventId(
  app: string,
  type: OpsEventType,
  shop: string,
  deduplicationKey: string,
): string {
  const digest = createHash("sha256")
    .update(`${shop}:${deduplicationKey}`)
    .digest("hex")
    .slice(0, 32);
  return `${app}:${type}:${digest}`;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
