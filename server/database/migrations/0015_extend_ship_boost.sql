-- Double pixels deals ended at the start of the weekday the nudge DM named, they now last until
-- the end of it. Deals already given out (all unused, since paying one clears it) get the day
-- back, including ones that have just ended, and it's noted in the bot log.
WITH extended AS (
  UPDATE "users" SET "ship_boost_until" = "ship_boost_until" + interval '1 day'
  WHERE "ship_boost_until" IS NOT NULL
  RETURNING "id", "ship_boost_until"
)
INSERT INTO "bot_log" ("user_id", "kind", "details")
SELECT "id", 'boost', jsonb_build_object(
  'enabled', true,
  'until', to_char("ship_boost_until" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'reason', 'admin'
)
FROM extended;
