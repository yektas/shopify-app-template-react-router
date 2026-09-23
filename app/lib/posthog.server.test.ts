import { describe, expect, it } from "vitest";

import { getPostHogConfig } from "./posthog.server";

describe("getPostHogConfig", () => {
  it("returns a normalized configuration for a valid project key", () => {
    expect(
      getPostHogConfig(
        { shop: " Snowdevil.myshopify.com ", shopName: " Snowdevil " },
        {
          POSTHOG_PROJECT_API_KEY: "phc_project_key",
          POSTHOG_API_HOST: "https://us.i.posthog.com/",
        },
      ),
    ).toEqual({
      apiKey: "phc_project_key",
      apiHost: "https://us.i.posthog.com",
      shop: {
        domain: "snowdevil.myshopify.com",
        name: "Snowdevil",
      },
    });
  });

  it("disables analytics without a valid project key", () => {
    expect(
      getPostHogConfig(
        { shop: "snowdevil.myshopify.com" },
        { POSTHOG_PROJECT_API_KEY: "not a project key" },
      ),
    ).toBeNull();
  });
});
