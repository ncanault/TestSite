// Scoring formulas and the Hive Composition placement algorithm, ported from
// the SOG#669 dashboard spec.

import {
  ATTACK_BUFF_FIELDS,
  DEFENSE_BUFF_FIELDS,
  DEFENSE_DEBUFF_FIELDS,
  type StatField,
} from "@/lib/stats";

// The 36 troop-buff/debuff fields below mirror src/lib/stats.ts field by
// field (kept as explicit literals here, rather than derived, so this type
// stays a plain object type IDEs and other tools can inspect normally).
export type AccountLike = {
  gameId: bigint;
  name: string;
  keep: number;
  power: number;
  rally: number;
  rein: number;

  atkGroundAttack: number;
  atkGroundHp: number;
  atkGroundDefense: number;
  atkRangedAttack: number;
  atkRangedHp: number;
  atkRangedDefense: number;
  atkCavalryAttack: number;
  atkCavalryHp: number;
  atkCavalryDefense: number;
  atkSiegeAttack: number;
  atkSiegeHp: number;
  atkSiegeDefense: number;

  defGroundAttack: number;
  defGroundHp: number;
  defGroundDefense: number;
  defRangedAttack: number;
  defRangedHp: number;
  defRangedDefense: number;
  defCavalryAttack: number;
  defCavalryHp: number;
  defCavalryDefense: number;
  defSiegeAttack: number;
  defSiegeHp: number;
  defSiegeDefense: number;

  defGroundDebuffAttack: number;
  defGroundDebuffHp: number;
  defGroundDebuffDefense: number;
  defRangedDebuffAttack: number;
  defRangedDebuffHp: number;
  defRangedDebuffDefense: number;
  defCavalryDebuffAttack: number;
  defCavalryDebuffHp: number;
  defCavalryDebuffDefense: number;
  defSiegeDebuffAttack: number;
  defSiegeDebuffHp: number;
  defSiegeDebuffDefense: number;
};

function sumFields(a: AccountLike, fields: StatField[]) {
  const record = a as unknown as Record<string, number>;
  return fields.reduce((total, f) => total + record[f.field], 0);
}

// Sum of the 12 Attack-phase buffs (Attack/HP/Defense across all 4 troop
// types).
export function attackScore(a: AccountLike) {
  return sumFields(a, ATTACK_BUFF_FIELDS);
}

// Sum of the 24 Defense-phase stats: the 12 Defense buffs plus the 12
// debuffs applied to the enemy while defending.
export function defenseScore(a: AccountLike) {
  return sumFields(a, DEFENSE_BUFF_FIELDS) + sumFields(a, DEFENSE_DEBUFF_FIELDS);
}

// Attack ÷ Defense, or null when not finite (all-zero defense buffs).
export function ratio(a: AccountLike): number | null {
  const def = defenseScore(a);
  if (def === 0) return null;
  return attackScore(a) / def;
}

export function formatRatio(r: number | null) {
  return r === null ? "—" : r.toFixed(2);
}

// Min-max normalize a value against an array of values, to 0..1.
// Returns 1 when every value in the array is equal.
export function norm(val: number, arr: number[]) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max === min) return 1;
  return (val - min) / (max - min);
}

// Highest norm(AttackScore) + norm(RallyCapacity). Ratio deliberately does
// NOT enter this calculation.
export function computeSetter<T extends AccountLike>(accounts: T[]): T | null {
  if (accounts.length === 0) return null;
  const atkArr = accounts.map(attackScore);
  const rallyArr = accounts.map((a) => a.rally);
  let best = accounts[0];
  let bestScore = -Infinity;
  accounts.forEach((a, i) => {
    const score = norm(atkArr[i], atkArr) + norm(rallyArr[i], rallyArr);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  });
  return best;
}

// --- Hive Composition placement -------------------------------------------
// Cells are assigned by true Euclidean distance to the center so every
// account sits as close to the Setter as the grid geometrically allows.
// Ties at the same distance are sorted by angle around the center and then
// interleaved from both ends of that list, so ties spread symmetrically
// instead of clustering toward one side.

export type HiveCell = { x: number; y: number };

export function generateHivePositions(n: number): HiveCell[] {
  if (n <= 0) return [];
  const boxRadius = Math.ceil(Math.sqrt(n)) + 4;
  const groups = new Map<number, HiveCell[]>();

  for (let x = -boxRadius; x <= boxRadius; x++) {
    for (let y = -boxRadius; y <= boxRadius; y++) {
      const d2 = x * x + y * y;
      if (!groups.has(d2)) groups.set(d2, []);
      groups.get(d2)!.push({ x, y });
    }
  }

  const sortedDistances = [...groups.keys()].sort((a, b) => a - b);
  const positions: HiveCell[] = [];

  for (const d2 of sortedDistances) {
    if (positions.length >= n) break;
    const cells = groups.get(d2)!;
    cells.sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));

    const interleaved: HiveCell[] = [];
    let lo = 0;
    let hi = cells.length - 1;
    let takeLow = true;
    while (lo <= hi) {
      if (takeLow) {
        interleaved.push(cells[lo]);
        lo++;
      } else {
        interleaved.push(cells[hi]);
        hi--;
      }
      takeLow = !takeLow;
    }
    positions.push(...interleaved);
  }

  return positions.slice(0, n);
}

export type HivePlacement<T> = { account: T; x: number; y: number; isSetter: boolean };

// setter anchors the center; everyone else fills outward sorted by Attack
// Score descending — unless `manualOrder` is given (team admin/leadership
// right-clicking a cell to swap two accounts, see HiveComposition), in
// which case it's used as-is instead of the Attack Score sort. Position
// geometry (generateHivePositions) only ever depends on the head count, so
// a manual order just changes who lands on which of the same tiles.
export function computeHiveComposition<T extends AccountLike>(
  accounts: T[],
  setter: T | null,
  manualOrder?: bigint[]
): HivePlacement<T>[] {
  if (accounts.length === 0) return [];
  const setterAccount = setter ?? computeSetter(accounts)!;

  let ordered: T[] | null = null;
  if (manualOrder) {
    const byId = new Map(accounts.map((a) => [a.gameId, a]));
    const resolved = manualOrder.map((id) => byId.get(id)).filter((a): a is T => a !== undefined);
    // Only trust the manual order if it still covers exactly this account
    // set — a stale order from before the roster selection changed falls
    // back to the auto layout instead of silently dropping accounts.
    if (resolved.length === accounts.length) ordered = resolved;
  }
  if (!ordered) {
    const rest = accounts
      .filter((a) => a.gameId !== setterAccount.gameId)
      .sort((a, b) => attackScore(b) - attackScore(a));
    ordered = [setterAccount, ...rest];
  }

  const positions = generateHivePositions(ordered.length);

  return ordered.map((account, i) => ({
    account,
    x: positions[i].x,
    y: positions[i].y,
    isSetter: account.gameId === setterAccount.gameId,
  }));
}
