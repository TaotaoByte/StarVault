export const SCHEMA_VERSION = 1;

export const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS items (
    id              TEXT PRIMARY KEY,
    type            TEXT NOT NULL,
    source_url      TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,

    github_owner    TEXT,
    github_repo     TEXT,
    github_stars    INTEGER DEFAULT 0,
    github_forks    INTEGER DEFAULT 0,
    github_language TEXT,
    github_topics   TEXT,
    readme_content  TEXT,
    readme_summary  TEXT,
    last_sync_at    TEXT,

    icon_url        TEXT,
    screenshot_urls TEXT,
    notes           TEXT,

    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    user_created    INTEGER DEFAULT 0,
    is_archived     INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tags (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    color       TEXT DEFAULT '#3b82f6',
    description TEXT,
    parent_id   TEXT REFERENCES tags(id),
    is_ai_generated INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS item_tags (
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    tag_id  TEXT REFERENCES tags(id) ON DELETE CASCADE,
    confidence REAL DEFAULT 1.0,
    PRIMARY KEY (item_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS collections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT DEFAULT 'folder',
    color       TEXT,
    parent_id   TEXT REFERENCES collections(id),
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS item_collections (
    item_id       TEXT REFERENCES items(id) ON DELETE CASCADE,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, collection_id)
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    item_id     TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
    embedding   BLOB NOT NULL,
    model       TEXT DEFAULT 'text-embedding-3-small',
    updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sync_meta (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at    TEXT,
    sync_target     TEXT,
    sync_target_id  TEXT,
    device_id       TEXT NOT NULL,
    schema_version  INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS change_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name  TEXT NOT NULL,
    record_id   TEXT NOT NULL,
    operation   TEXT NOT NULL,
    old_data    TEXT,
    new_data    TEXT,
    timestamp   TEXT DEFAULT CURRENT_TIMESTAMP,
    synced      INTEGER DEFAULT 0,
    sync_retry  INTEGER DEFAULT 0
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    description,
    readme_content,
    readme_summary,
    content='items',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, description, readme_content, readme_summary)
    VALUES (new.id, new.title, new.description, new.readme_content, new.readme_summary);
  END;

  CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE ON items BEGIN
    UPDATE items_fts SET
      title = new.title,
      description = new.description,
      readme_content = new.readme_content,
      readme_summary = new.readme_summary
    WHERE rowid = new.id;
  END;

  CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, description, readme_content, readme_summary)
    VALUES ('delete', old.id, old.title, old.description, old.readme_content, old.readme_summary);
  END;

  INSERT OR IGNORE INTO sync_meta (id, device_id, schema_version) VALUES (1, lower(hex(randomblob(16))), ${SCHEMA_VERSION});
  `,
];
