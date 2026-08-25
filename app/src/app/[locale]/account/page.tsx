import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/guards";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("Account");

  return (
    <div className="reveal">
      <h1 className="text-2xl mb-1">{t("title")}</h1>
      <p className="text-text-dim mb-8">{t("subtitle", { name: user.playerName })}</p>

      <div className="section-label">{t("changePasswordTitle")}</div>
      <ChangePasswordForm />
    </div>
  );
}
