CREATE TABLE IF NOT EXISTS wardrobe_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  seasons TEXT NOT NULL DEFAULT '[]',
  colors TEXT,
  temp_min INTEGER,
  temp_max INTEGER,
  description TEXT,
  photo_key TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wardrobe_outfits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  item_ids TEXT NOT NULL DEFAULT '[]',
  suggested_at TEXT,
  weather_temp INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_created ON wardrobe_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_category ON wardrobe_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_wardrobe_outfits_user_created ON wardrobe_outfits(user_id, created_at DESC);
