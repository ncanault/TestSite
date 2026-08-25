import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // Next 15 changed the client-side cache window for dynamic pages
    // (every page here — Team, Alliance, Competitive, Dashboard, Admin,
    // ...— is `force-dynamic`) from 30s down to 0s by default: clicking
    // any nav link re-fetches from the server every single time, with no
    // client cache at all. That's the main reason navigation feels slow.
    // A short window here brings back near-instant repeat navigation
    // (e.g. Team → Alliance → Team within 30s) without sacrificing much
    // freshness — any server action still busts the cache immediately via
    // its own revalidatePath call, so mutations show up right away.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default withNextIntl(nextConfig);
