import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Next.js 16 renamed the `middleware` convention to `proxy`; this is the
// same next-intl middleware handler, just exported under the new name.
export function proxy(request: Parameters<typeof intlMiddleware>[0]) {
  return intlMiddleware(request);
}

export const config = {
  // Skip API routes, Next internals, and files with an extension (assets).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
