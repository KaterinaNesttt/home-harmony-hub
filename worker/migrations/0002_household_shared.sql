ALTER TABLE shopping_items ADD COLUMN added_by_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_access ON tasks(access);
CREATE INDEX IF NOT EXISTS idx_tasks_user_access ON tasks(user_id, access);
CREATE INDEX IF NOT EXISTS idx_lists_access ON shopping_lists(access);
CREATE INDEX IF NOT EXISTS idx_lists_user_access ON shopping_lists(user_id, access);
CREATE INDEX IF NOT EXISTS idx_items_list_added_by ON shopping_items(list_id, added_by_user_id);
