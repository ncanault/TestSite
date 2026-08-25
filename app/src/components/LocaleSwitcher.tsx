"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, LOCALE_LABELS, type AppLocale } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function onChange(next: string) {
    router.replace(
      // @ts-expect-error -- params keys vary per route, next-intl's typed
      // navigation can't know them statically here.
      { pathname, params },
      { locale: next }
    );
  }

  return (
    <select
      aria-label="Language"
      className="field-input !w-auto !py-1.5 !text-xs font-data"
      value={locale}
      onChange={(e) => onChange(e.target.value)}
    >
      {routing.locales.map((l: AppLocale) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
