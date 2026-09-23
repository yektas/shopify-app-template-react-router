import { beforeEach, describe, expect, it, vi } from "vitest";

const useEffectMock = vi.hoisted(() => vi.fn());
const useRefMock = vi.hoisted(() => vi.fn());
const readyRef = vi.hoisted(() => ({ current: false }));
const locationState = vi.hoisted(() => ({
  current: { pathname: "/app", search: "" },
}));
const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
  get_distinct_id: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: useEffectMock,
  useRef: useRefMock,
}));

vi.mock("react-router", () => ({
  useLocation: () => locationState.current,
}));

vi.mock("posthog-js", () => ({ posthog: posthogMock }));

import { PostHogAnalytics } from "./posthog-analytics";

const config = {
  apiKey: "phc_key",
  apiHost: "https://eu.i.posthog.com",
  shop: { domain: "snowdevil.myshopify.com", name: "Snowdevil" },
};

describe("PostHogAnalytics", () => {
  const effects: Array<() => void | (() => void)> = [];

  beforeEach(() => {
    effects.length = 0;
    readyRef.current = false;
    locationState.current = { pathname: "/app", search: "" };
    useEffectMock.mockReset();
    useEffectMock.mockImplementation((effect) => effects.push(effect));
    useRefMock.mockReset();
    useRefMock.mockImplementation(() => readyRef);
    posthogMock.init.mockReset();
    posthogMock.identify.mockReset();
    posthogMock.reset.mockReset();
    posthogMock.capture.mockReset();
    posthogMock.get_distinct_id.mockReset();
  });

  it("initializes, identifies the shop, and captures the first pageview", () => {
    posthogMock.get_distinct_id.mockReturnValue("snowdevil.myshopify.com");

    PostHogAnalytics({ config });
    effects.forEach((effect) => effect());

    expect(posthogMock.init).toHaveBeenCalledWith("phc_key", {
      api_host: "https://eu.i.posthog.com",
      capture_pageview: false,
      person_profiles: "identified_only",
    });
    expect(posthogMock.identify).toHaveBeenCalledWith(
      "snowdevil.myshopify.com",
      { shop_name: "Snowdevil" },
    );
    expect(posthogMock.capture).toHaveBeenCalledWith("$pageview");
  });

  it("resets before identifying a different shop", () => {
    posthogMock.get_distinct_id.mockReturnValue("previous.myshopify.com");

    PostHogAnalytics({ config });
    effects[0]();

    expect(posthogMock.reset).toHaveBeenCalledOnce();
    expect(posthogMock.identify).toHaveBeenCalledWith(
      "snowdevil.myshopify.com",
      { shop_name: "Snowdevil" },
    );
  });

  it("does not initialize when analytics is disabled", () => {
    PostHogAnalytics({ config: null });
    effects.forEach((effect) => effect());

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.identify).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});
