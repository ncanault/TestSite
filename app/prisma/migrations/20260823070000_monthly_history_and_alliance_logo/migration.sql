-- Bound AccountHistory to one row per account per calendar month (was:
-- unbounded, one row per save), and add the alliance logo. Written by hand
-- to backfill/dedupe existing data safely.

-- 1. Alliance logo (simple nullable column, no backfill needed).
ALTER TABLE "Alliance" ADD COLUMN "logoDataUrl" TEXT;

-- 2. Add periodMonth, nullable for now so we can backfill it.
ALTER TABLE "AccountHistory" ADD COLUMN "periodMonth" TIMESTAMP(3);

-- 3. Backfill: bucket every existing row into the month it was captured in.
UPDATE "AccountHistory"
SET "periodMonth" = date_trunc('month', "capturedAt");

-- 4. Collapse existing per-save rows down to one per (account, month): keep
--    only the most recently captured row in each bucket.
DELETE FROM "AccountHistory" h
USING "AccountHistory" h2
WHERE h."accountGameId" = h2."accountGameId"
  AND h."periodMonth" = h2."periodMonth"
  AND h.id <> h2.id
  AND h."capturedAt" < h2."capturedAt";

-- 5. Finalize: NOT NULL + the new one-row-per-account-per-month constraint.
ALTER TABLE "AccountHistory" ALTER COLUMN "periodMonth" SET NOT NULL;
CREATE UNIQUE INDEX "AccountHistory_accountGameId_periodMonth_key"
  ON "AccountHistory"("accountGameId", "periodMonth");
