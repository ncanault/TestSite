// Monthly bucketing + gap-filling for AccountHistory. AccountHistory holds
// at most one row per account per calendar month (see the schema comment);
// this file is the read-side complement: when a month has no row for an
// account, carry forward that account's last known snapshot so the
// evolution chart draws a continuous line instead of a gap.

export function periodMonthOf(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, n: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1));
}

type MonthlyRow = { accountGameId: bigint; periodMonth: Date };

// Fills gaps up through the current month. Input rows don't need to be
// pre-sorted; output is grouped by account, ascending by month.
export function fillMonthlyGaps<T extends MonthlyRow>(rows: T[]): T[] {
  const byAccount = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.accountGameId.toString();
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key)!.push(row);
  }

  const currentMonth = periodMonthOf();
  const filled: T[] = [];

  for (const accountRows of byAccount.values()) {
    accountRows.sort((a, b) => a.periodMonth.getTime() - b.periodMonth.getTime());

    let cursor = accountRows[0].periodMonth;
    let rowIndex = 0;
    let lastKnown = accountRows[0];

    while (cursor.getTime() <= currentMonth.getTime()) {
      if (
        rowIndex < accountRows.length &&
        accountRows[rowIndex].periodMonth.getTime() === cursor.getTime()
      ) {
        lastKnown = accountRows[rowIndex];
        filled.push(lastKnown);
        rowIndex++;
      } else {
        // Carry the last known snapshot forward, restamped at this month.
        filled.push({ ...lastKnown, periodMonth: cursor });
      }
      cursor = addMonths(cursor, 1);
    }
  }

  return filled;
}
