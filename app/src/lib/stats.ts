// Canonical list of the 36 troop-buff/debuff stat fields tracked per
// account, shared by the schema, the account form, the alliance charts, and
// the scoring formulas so the field list only has to be maintained in one
// place.
//
// The game has two phases — Attack (your troops attacking) and Defense
// (your troops being attacked) — and for each phase you track three buffs
// per troop type: Attack, HP, Defense. The Defense phase additionally
// tracks three debuffs per troop type (they reduce the attacker's stats,
// and only apply while defending).

export const TROOPS = ["ground", "ranged", "cavalry", "siege"] as const;
export type Troop = (typeof TROOPS)[number];

const TROOP_LABEL: Record<Troop, string> = {
  ground: "Ground",
  ranged: "Ranged",
  cavalry: "Cavalry",
  siege: "Siege",
};

export type StatKind = "attack" | "hp" | "defense";
const STAT_LABEL: Record<StatKind, string> = {
  attack: "Attack",
  hp: "Hp",
  defense: "Defense",
};

export type StatField = {
  field: string;
  troop: Troop;
  stat: StatKind;
};

function buildFields(prefix: string, debuff: boolean): StatField[] {
  return TROOPS.flatMap((troop) =>
    (["attack", "hp", "defense"] as StatKind[]).map((stat) => ({
      field: `${prefix}${TROOP_LABEL[troop]}${debuff ? "Debuff" : ""}${STAT_LABEL[stat]}`,
      troop,
      stat,
    }))
  );
}

// Attack phase buffs — 12 fields (atkGroundAttack, atkGroundHp, ...).
export const ATTACK_BUFF_FIELDS = buildFields("atk", false);

// Defense phase buffs — 12 fields (defGroundAttack, defGroundHp, ...).
export const DEFENSE_BUFF_FIELDS = buildFields("def", false);

// Defense phase debuffs applied to the enemy — 12 fields
// (defGroundDebuffAttack, ...), only meaningful while defending.
export const DEFENSE_DEBUFF_FIELDS = buildFields("def", true);

export const ALL_STAT_FIELDS = [
  ...ATTACK_BUFF_FIELDS,
  ...DEFENSE_BUFF_FIELDS,
  ...DEFENSE_DEBUFF_FIELDS,
];

export const STAT_FIELD_NAMES = ALL_STAT_FIELDS.map((f) => f.field);
