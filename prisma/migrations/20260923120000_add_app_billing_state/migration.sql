CREATE TABLE "AppBillingState" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "activeSubscription" BOOLEAN NOT NULL DEFAULT false,
    "planItemHandlesJson" TEXT NOT NULL DEFAULT '[]',
    "planItemDescriptionsJson" TEXT NOT NULL DEFAULT '[]',
    "trialEndsAt" DATETIME,
    "currentPeriodEnd" DATETIME,
    "lastReconciledAt" DATETIME,
    "billingUnavailableSince" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
