-- Draft: RLS for per-user topic progress (maps to Prisma model UserTopicProgress / table user_topic_progress).
-- Prerequisites: PostgreSQL; app user id available as current_setting('app.user_id')::int OR replace with auth.uid() mapping.
-- NOT applied to SQLite. Adjust table/column names after Prisma migrate.

-- ALTER TABLE user_topic_progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_topic_progress FORCE ROW LEVEL SECURITY;

-- Example: learners may only read/write their own rows
-- CREATE POLICY utp_select_own ON user_topic_progress
--   FOR SELECT
--   TO authenticated
--   USING (user_id = current_setting('app.user_id', true)::int);

-- CREATE POLICY utp_insert_own ON user_topic_progress
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (user_id = current_setting('app.user_id', true)::int);

-- CREATE POLICY utp_update_own ON user_topic_progress
--   FOR UPDATE
--   TO authenticated
--   USING (user_id = current_setting('app.user_id', true)::int)
--   WITH CHECK (user_id = current_setting('app.user_id', true)::int);

-- CREATE POLICY utp_delete_deny ON user_topic_progress
--   FOR DELETE
--   TO authenticated
--   USING (false);

-- Service role (bypasses RLS in Supabase) used only from backend jobs / admin.
