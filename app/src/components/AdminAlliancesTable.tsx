"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { deleteAllianceAction } from "@/app/actions/admin";
import AdminAllianceEditForm from "@/components/AdminAllianceEditForm";

type AllianceRow = {
  id: string;
  tag: string;
  name: string;
  server: { number: string };
  owner: { playerName: string };
  members: { id: string }[];
  _count: { accounts: number };
};

export default function AdminAlliancesTable({ alliances }: { alliances: AllianceRow[] }) {
  const t = useTranslations("AdminPage");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alliances;
    return alliances.filter(
      (a) =>
        a.tag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.server.number.toLowerCase().includes(q) ||
        a.owner.playerName.toLowerCase().includes(q)
    );
  }, [alliances, query]);

  return (
    <div>
      <input
        className="field-input !w-auto !text-xs mb-3"
        placeholder={t("filterPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="panel overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>{t("colAlliance")}</th>
              <th>{t("colServer")}</th>
              <th>{t("colCreator")}</th>
              <th>{t("colMembers")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const hasAccounts = a._count.accounts > 0;
              const isEditing = editingId === a.id;
              return (
                <tr key={a.id} data-alliance-id={a.id}>
                  {isEditing ? (
                    <td colSpan={2}>
                      <AdminAllianceEditForm
                        allianceId={a.id}
                        tag={a.tag}
                        name={a.name}
                        onDone={() => setEditingId(null)}
                      />
                    </td>
                  ) : (
                    <>
                      <td>
                        [{a.tag}] {a.name}
                      </td>
                      <td>{a.server.number}</td>
                    </>
                  )}
                  <td className="text-text-dim">{a.owner.playerName}</td>
                  <td className="text-text-dim">{a.members.length}</td>
                  <td className="whitespace-nowrap">
                    {!isEditing && (
                      <button
                        type="button"
                        className="text-steel hover:underline text-xs mr-3"
                        onClick={() => setEditingId(a.id)}
                      >
                        {t("edit")}
                      </button>
                    )}
                    {hasAccounts ? (
                      <span
                        className="text-text-dim text-xs cursor-not-allowed"
                        title={t("deleteAllianceHasAccounts")}
                      >
                        {t("delete")}
                      </span>
                    ) : (
                      <form action={deleteAllianceAction} className="inline">
                        <input type="hidden" name="allianceId" value={a.id} />
                        <button type="submit" className="text-red hover:underline text-xs">
                          {t("delete")}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-text-dim py-6">
                  {t("noAlliances")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
