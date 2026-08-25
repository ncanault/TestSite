-- Subscriptions move from Alliance-owned to User-owned: each player now
-- needs their own active subscription to see their alliance's data, rather
-- than one alliance-wide subscription covering every member. Written by
-- hand (not `prisma migrate diff`) to backfill existing data safely instead
-- of assuming the table is empty.

-- 1. Rename the Tier enum value BASIC -> FREE. (No explicit BEGIN/COMMIT
--    here — `prisma migrate deploy` already wraps this whole file in one
--    transaction; nesting our own breaks that.)
CREATE TYPE "Tier_new" AS ENUM ('NONE', 'FREE', 'ALLIANCE', 'COMPETITIVE');
ALTER TABLE "Subscription" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "tier" TYPE "Tier_new"
  USING (CASE WHEN "tier"::text = 'BASIC' THEN 'FREE' ELSE "tier"::text END)::"Tier_new";
ALTER TYPE "Tier" RENAME TO "Tier_old";
ALTER TYPE "Tier_new" RENAME TO "Tier";
DROP TYPE "Tier_old";

-- 2. Add the new userId column (nullable for now, so we can backfill it)
--    plus currentPeriodEnd.
ALTER TABLE "Subscription" ADD COLUMN "userId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

-- 3. Backfill: an existing alliance-level subscription becomes that
--    alliance owner's personal subscription.
UPDATE "Subscription" s
SET "userId" = a."ownerId"
FROM "Alliance" a
WHERE a."id" = s."allianceId";

-- 4. A user who owns more than one alliance would now have more than one
--    Subscription row, violating the new one-per-user constraint below —
--    keep only their most recently updated one.
DELETE FROM "Subscription" s
USING "Subscription" s2
WHERE s."userId" = s2."userId"
  AND s."userId" IS NOT NULL
  AND s.id <> s2.id
  AND s."updatedAt" < s2."updatedAt";

-- 5. A row that still has no userId (its alliance was somehow missing)
--    can't be salvaged.
DELETE FROM "Subscription" WHERE "userId" IS NULL;

-- 6. Drop the old alliance link.
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_allianceId_fkey";
DROP INDEX "Subscription_allianceId_key";
ALTER TABLE "Subscription" DROP COLUMN "allianceId";

-- 7. Finalize userId + the new defaults (every subscription now defaults
--    to the free tier, active immediately).
ALTER TABLE "Subscription" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "tier" SET DEFAULT 'FREE';
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Give every user who still has no subscription row (non-owner members,
--    or any user created before this migration) a free/active one.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO "Subscription" ("id", "userId", "tier", "status", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'FREE', 'ACTIVE', now()
FROM "User" u
LEFT JOIN "Subscription" s ON s."userId" = u."id"
WHERE s."id" IS NULL;

-- 8b. The free tier no longer has a request/approval step — any leftover
--     row that renamed from a pending/cancelled Basic request is now just
--     active free access.
UPDATE "Subscription"
SET "status" = 'ACTIVE', "activatedAt" = COALESCE("activatedAt", now())
WHERE "tier" = 'FREE' AND "status" <> 'ACTIVE';

-- 9. Preset-color avatar.
ALTER TABLE "User" ADD COLUMN "avatarColor" TEXT NOT NULL DEFAULT 'gold';

-- 10. Subscription history log (new table, uses the final Tier enum).
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "paypalRef" TEXT,
    "requestedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "activatedBy" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubscriptionHistory_userId_createdAt_idx" ON "SubscriptionHistory"("userId", "createdAt");
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
