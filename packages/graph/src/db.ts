import Database from 'better-sqlite3';

import { SCHEMA_DDL } from './schema.js';

export const createDatabase = (path: string): Database.Database => {
  const db = new Database(path);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('mmap_size = 268435456');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');
  db.pragma('wal_autocheckpoint = 1000');

  db.exec(SCHEMA_DDL);

  return db;
};
