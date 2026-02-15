export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  importance REAL NOT NULL,
  confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  invalidated_at INTEGER
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES nodes(id),
  target_id TEXT NOT NULL REFERENCES nodes(id),
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (source_id != target_id)
);

CREATE TABLE IF NOT EXISTS node_tags (
  node_id TEXT NOT NULL REFERENCES nodes(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (node_id, tag)
);

CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  title,
  content,
  tags,
  role,
  content='',
  tokenize='unicode61'
);

CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type) WHERE invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nodes_role ON nodes(role) WHERE invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id, target_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id, source_id);
CREATE INDEX IF NOT EXISTS idx_edges_source_type ON edges(source_id, type);
CREATE INDEX IF NOT EXISTS idx_edges_target_type ON edges(target_id, type);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON node_tags(tag);

CREATE TRIGGER IF NOT EXISTS nodes_fts_ai
AFTER INSERT ON nodes
BEGIN
  INSERT INTO nodes_fts(rowid, title, content, tags, role)
  VALUES (new.rowid, new.title, new.content, new.tags_json, new.role);
END;

CREATE TRIGGER IF NOT EXISTS nodes_fts_ad
AFTER DELETE ON nodes
BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, title, content, tags, role)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags_json, old.role);
END;

CREATE TRIGGER IF NOT EXISTS node_tags_ai
AFTER INSERT ON nodes
BEGIN
  INSERT INTO node_tags(node_id, tag)
  SELECT new.id, value
  FROM json_each(new.tags_json);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS nodes_vec USING vec0(
  node_id TEXT PRIMARY KEY,
  embedding float[384]
);

CREATE TRIGGER IF NOT EXISTS nodes_vec_invalidate
AFTER UPDATE OF invalidated_at ON nodes
WHEN new.invalidated_at IS NOT NULL AND old.invalidated_at IS NULL
BEGIN
  DELETE FROM nodes_vec WHERE node_id = old.id;
END;
`;
