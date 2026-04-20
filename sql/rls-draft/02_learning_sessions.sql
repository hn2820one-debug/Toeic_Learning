-- Draft: RLS for closed-loop sessions (Prisma: LearningSession -> learning_sessions, LearningSessionItem -> learning_session_items).
-- Child rows must match parent's user_id. NOT for SQLite.

-- ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE learning_sessions FORCE ROW LEVEL SECURITY;

-- CREATE POLICY ls_select_own ON learning_sessions
--   FOR SELECT TO authenticated
--   USING (user_id = current_setting('app.user_id', true)::int);

-- CREATE POLICY ls_insert_own ON learning_sessions
--   FOR INSERT TO authenticated
--   WITH CHECK (user_id = current_setting('app.user_id', true)::int);

-- CREATE POLICY ls_update_own ON learning_sessions
--   FOR UPDATE TO authenticated
--   USING (user_id = current_setting('app.user_id', true)::int)
--   WITH CHECK (user_id = current_setting('app.user_id', true)::int);

-- CREATE POLICY ls_delete_deny ON learning_sessions
--   FOR DELETE TO authenticated USING (false);

-- Items: ownership via join to parent session
-- ALTER TABLE learning_session_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE learning_session_items FORCE ROW LEVEL SECURITY;

-- CREATE POLICY lsi_all_via_parent ON learning_session_items
--   FOR ALL TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM learning_sessions s
--       WHERE s.id = learning_session_items.learning_session_id
--         AND s.user_id = current_setting('app.user_id', true)::int
--     )
--   )
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM learning_sessions s
--       WHERE s.id = learning_session_items.learning_session_id
--         AND s.user_id = current_setting('app.user_id', true)::int
--     )
--   );
