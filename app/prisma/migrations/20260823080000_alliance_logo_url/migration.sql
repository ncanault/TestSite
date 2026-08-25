-- Alliance logo becomes a plain external URL instead of an inline
-- data-URI: simpler, no size cap to enforce, no base64 bloat in the DB.
ALTER TABLE "Alliance" RENAME COLUMN "logoDataUrl" TO "logoUrl";
