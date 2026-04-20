-- Draft: hypothetical discussion_posts table (NOT in current Prisma schema).
-- Illustrates author-based ownership for a future feature.

-- CREATE TABLE discussion_posts (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   author_user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   topic_key text,
--   lesson_id text,
--   body text NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   updated_at timestamptz NOT NULL DEFAULT now(),
--   deleted_at timestamptz
-- );

-- ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE discussion_posts FORCE ROW LEVEL SECURITY;

-- Public read of non-deleted posts (optional: narrow by topic enrollment)
-- CREATE POLICY dp_select_visible ON discussion_posts
--   FOR SELECT TO authenticated
--   USING (deleted_at IS NULL);

-- Author can insert own row
-- CREATE POLICY dp_insert_author ON discussion_posts
--   FOR INSERT TO authenticated
--   WITH CHECK (author_user_id = current_setting('app.user_id', true)::int);

-- Author can update own posts
-- CREATE POLICY dp_update_own ON discussion_posts
--   FOR UPDATE TO authenticated
--   USING (author_user_id = current_setting('app.user_id', true)::int)
--   WITH CHECK (author_user_id = current_setting('app.user_id', true)::int);

-- Soft-delete via UPDATE deleted_at; hard DELETE denied for learners
-- CREATE POLICY dp_delete_deny ON discussion_posts
--   FOR DELETE TO authenticated USING (false);
