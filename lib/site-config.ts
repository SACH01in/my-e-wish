const configuredSiteUrl =
  process.env.SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export const SITE_URL = new URL(configuredSiteUrl).origin;
export const SITE_NAME = "my e-Wish";
