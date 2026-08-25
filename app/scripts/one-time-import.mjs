// One-time historical-data import (requested via chat, not a UI feature).
// Reads scripts/one-time-import.data.json — any number of accounts, any
// number of months each — and for every account: deletes its existing
// history and re-inserts it from the file, updates its current stats to
// the latest month, and creates the account (under the [SOG] alliance on
// server 669) if it doesn't exist yet, or leaves its existing alliance
// untouched if it does.
//
// Guarded behind RUN_ONE_TIME_IMPORT=true so it's a harmless no-op on
// every other deploy — it only runs on the one deploy where that env var
// is set. Remove this guard var (and ideally this whole script) from
// Railway once the import has run successfully.
//
// Chained after `prisma migrate deploy` in package.json's
// `db:migrate:deploy` script, so it always runs against the up-to-date
// schema — and, since that whole chain blocks the app from starting until
// it finishes, this needs to be fast even for a large batch: each
// account's history is written with one createMany instead of one create
// per row, and accounts are processed with bounded concurrency instead of
// one at a time.

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 8;

function periodMonthOf(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

async function importAccount(prisma, gameId, records) {
  const STAT_FIELDS = Object.keys(records[0]).filter(
    (k) => !["month", "gameId", "name", "keep", "power", "rally", "rein"].includes(k)
  );
  const latest = [...records].sort((a, b) => (a.month < b.month ? -1 : 1)).at(-1);
  const statValues = Object.fromEntries(STAT_FIELDS.map((k) => [k, latest[k]]));

  const existing = await prisma.account.findUnique({ where: { gameId } });
  let allianceId = existing?.allianceId;

  if (existing) {
    console.log(
      `[one-time-import] Found "${existing.name}" (gameId ${gameId}) in alliance ${existing.allianceId}.`
    );
  } else {
    const alliance = await prisma.alliance.findFirst({
      where: { tag: "SOG", server: { number: "669" } },
    });
    if (!alliance) {
      console.error(
        `[one-time-import] No existing Account with gameId ${gameId}, and no [SOG] alliance ` +
          `on server 669 to create it under. Skipping this account (not fatal for the deploy).`
      );
      return;
    }
    allianceId = alliance.id;
    console.log(
      `[one-time-import] No existing Account with gameId ${gameId} — creating it under [SOG] ` +
        `(server 669), alliance ${allianceId}.`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountHistory.deleteMany({ where: { accountGameId: gameId } });

    await tx.account.upsert({
      where: { gameId },
      create: {
        gameId,
        allianceId,
        name: latest.name,
        keep: latest.keep,
        power: latest.power,
        rally: latest.rally,
        rein: latest.rein,
        ...statValues,
      },
      update: {
        name: latest.name,
        keep: latest.keep,
        power: latest.power,
        rally: latest.rally,
        rein: latest.rein,
        ...statValues,
      },
    });

    // One bulk insert for the whole account's history instead of one
    // create per month — this is what made the previous version slow
    // enough to trip Railway's deploy health check on an 85-account file
    // (13 sequential round trips per account instead of 3).
    await tx.accountHistory.createMany({
      data: records.map((r) => {
        const rStats = Object.fromEntries(STAT_FIELDS.map((k) => [k, r[k]]));
        return {
          accountGameId: gameId,
          periodMonth: periodMonthOf(r.month),
          keep: r.keep,
          power: r.power,
          rally: r.rally,
          rein: r.rein,
          ...rStats,
        };
      }),
    });
  });

  console.log(
    `[one-time-import] Done with gameId ${gameId}: replaced history with ${records.length} row(s), current stats from ${latest.month}.`
  );
}

// Runs `items` through `worker` with at most `limit` in flight at once —
// keeps a large account list from either running fully sequentially (slow)
// or all at once (could exceed the DB's connection pool).
async function runWithConcurrency(items, limit, worker) {
  let index = 0;
  async function next() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
}

async function main() {
  if (process.env.RUN_ONE_TIME_IMPORT !== "true") {
    console.log("[one-time-import] RUN_ONE_TIME_IMPORT not set to 'true' — skipping.");
    return;
  }

  const allRecords = JSON.parse(readFileSync(join(__dirname, "one-time-import.data.json"), "utf8"));

  const byGameId = new Map();
  for (const r of allRecords) {
    const gameId = BigInt(r.gameId);
    if (!byGameId.has(gameId)) byGameId.set(gameId, []);
    byGameId.get(gameId).push(r);
  }
  console.log(`[one-time-import] ${allRecords.length} row(s) across ${byGameId.size} account(s).`);

  const prisma = new PrismaClient();
  try {
    await runWithConcurrency([...byGameId.entries()], CONCURRENCY, ([gameId, records]) =>
      importAccount(prisma, gameId, records)
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // Deliberately non-fatal: a failure here must never block the app from
  // deploying and starting.
  console.error("[one-time-import] failed (deploy continues regardless):", e);
});
