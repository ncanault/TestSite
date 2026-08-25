import { getTranslations } from "next-intl/server";
import AllianceLogoEditor from "@/components/AllianceLogoEditor";
import AllianceNameTagEditor from "@/components/AllianceNameTagEditor";

export default async function AllianceHeader({
  alliance,
  tier,
  isOwner,
  eyebrow,
  serverLink,
  editNameTag = false,
}: {
  alliance: { tag: string; name: string; logoUrl: string | null; server: { number: string } };
  tier: string;
  isOwner: boolean;
  eyebrow: string;
  // External link shown next to the server/tier line — only passed on
  // pages where it's relevant (Competitive links to SVS.info).
  serverLink?: string;
  // Team-page-only: every other page using this header (Buffs Analysis,
  // Battlefield, dashboard) keeps the [tag] name heading read-only.
  editNameTag?: boolean;
}) {
  const t = await getTranslations("AllianceHeader");

  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div className="section-label">{eyebrow}</div>
      <div className="flex items-center justify-center gap-5">
        <AllianceLogoEditor
          tag={alliance.tag}
          name={alliance.name}
          logoUrl={alliance.logoUrl}
          isOwner={isOwner}
        />
        <div>
          {isOwner && editNameTag ? (
            <AllianceNameTagEditor tag={alliance.tag} name={alliance.name} />
          ) : (
            <p className="text-2xl font-display leading-tight">
              [{alliance.tag}] {alliance.name}
            </p>
          )}
          <p className="text-text-dim text-sm mt-0.5">
            {t("serverAndTier", { number: alliance.server.number, tier })}
          </p>
          {serverLink && (
            <a
              href={serverLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-steel hover:underline text-xs mt-1 inline-block"
            >
              {t("svsInfoLink")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
