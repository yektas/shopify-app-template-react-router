export interface PostHogShopIdentity {
  domain: string;
  name: string;
}

export interface PostHogConfig {
  apiKey: string;
  apiHost: string;
  shop: PostHogShopIdentity;
}
