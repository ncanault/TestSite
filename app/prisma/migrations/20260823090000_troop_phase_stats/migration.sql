-- Replace the old lossy 10-field buff model with a full 36-field one that
-- matches the game's actual mechanics: two phases (Attack, Defense), each
-- tracking Attack/HP/Defense buffs per troop type (Ground/Ranged/Cavalry/
-- Siege), plus Defense-phase-only debuffs (Attack/HP/Defense) that reduce
-- the enemy's stats. Field names are shared with the account form, the
-- domain scoring formulas, and the historical-import CSV — see
-- src/lib/stats.ts for the single source of truth.
--
-- Old data in the dropped columns does not map cleanly onto the new model
-- (that mismatch is exactly why this migration exists), so the new columns
-- start at 0 pending a fresh import of real data.

-- Account
ALTER TABLE "Account" DROP COLUMN "siege";
ALTER TABLE "Account" DROP COLUMN "range";
ALTER TABLE "Account" DROP COLUMN "cavs";
ALTER TABLE "Account" DROP COLUMN "ground";
ALTER TABLE "Account" DROP COLUMN "siegeAtk";
ALTER TABLE "Account" DROP COLUMN "groundDef";
ALTER TABLE "Account" DROP COLUMN "cavsHp";
ALTER TABLE "Account" DROP COLUMN "archerDeb";
ALTER TABLE "Account" DROP COLUMN "siegeAtkDeb";
ALTER TABLE "Account" DROP COLUMN "siegeHpDeb";

ALTER TABLE "Account" ADD COLUMN "atkGroundAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkGroundHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkGroundDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkRangedAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkRangedHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkRangedDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkCavalryAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkCavalryHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkCavalryDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkSiegeAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkSiegeHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "atkSiegeDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defGroundAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defGroundHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defGroundDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defRangedAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defRangedHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defRangedDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defCavalryAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defCavalryHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defCavalryDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defSiegeAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defSiegeHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defSiegeDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defGroundDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defGroundDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defGroundDebuffDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defRangedDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defRangedDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defRangedDebuffDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defCavalryDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defCavalryDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defCavalryDebuffDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defSiegeDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defSiegeDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "defSiegeDebuffDefense" INTEGER NOT NULL DEFAULT 0;

-- AccountHistory
ALTER TABLE "AccountHistory" DROP COLUMN "siege";
ALTER TABLE "AccountHistory" DROP COLUMN "range";
ALTER TABLE "AccountHistory" DROP COLUMN "cavs";
ALTER TABLE "AccountHistory" DROP COLUMN "ground";
ALTER TABLE "AccountHistory" DROP COLUMN "siegeAtk";
ALTER TABLE "AccountHistory" DROP COLUMN "groundDef";
ALTER TABLE "AccountHistory" DROP COLUMN "cavsHp";
ALTER TABLE "AccountHistory" DROP COLUMN "archerDeb";
ALTER TABLE "AccountHistory" DROP COLUMN "siegeAtkDeb";
ALTER TABLE "AccountHistory" DROP COLUMN "siegeHpDeb";

ALTER TABLE "AccountHistory" ADD COLUMN "atkGroundAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkGroundHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkGroundDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkRangedAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkRangedHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkRangedDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkCavalryAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkCavalryHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkCavalryDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkSiegeAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkSiegeHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "atkSiegeDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defGroundAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defGroundHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defGroundDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defRangedAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defRangedHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defRangedDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defCavalryAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defCavalryHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defCavalryDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defSiegeAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defSiegeHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defSiegeDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defGroundDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defGroundDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defGroundDebuffDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defRangedDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defRangedDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defRangedDebuffDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defCavalryDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defCavalryDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defCavalryDebuffDefense" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defSiegeDebuffAttack" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defSiegeDebuffHp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AccountHistory" ADD COLUMN "defSiegeDebuffDefense" INTEGER NOT NULL DEFAULT 0;
