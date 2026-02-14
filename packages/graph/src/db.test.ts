import { describe, expect, it } from 'vitest';

import { createDatabase } from './db';

describe('createDatabase', () => {
  it('creates an in-memory sqlite database', () => {
    const db = createDatabase(':memory:');

    expect(db).toBeDefined();

    db.close();
  });

  it('applies foreign key PRAGMA', () => {
    const db = createDatabase(':memory:');

    const pragma = db.pragma('foreign_keys', { simple: false }) as Array<{ foreign_keys: number }>;
    expect(pragma).toEqual([{ foreign_keys: 1 }]);

    db.close();
  });

  it('creates required tables including FTS table', () => {
    const db = createDatabase(':memory:');

    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{
      name: string;
    }>;
    const tableNames = rows.map((row) => row.name);

    expect(tableNames).toContain('nodes');
    expect(tableNames).toContain('edges');
    expect(tableNames).toContain('node_tags');
    expect(tableNames).toContain('nodes_fts');

    db.close();
  });

  it('syncs tags into node_tags on insert', () => {
    const db = createDatabase(':memory:');

    db.prepare(
      `
        INSERT INTO nodes (id, type, role, title, content, tags_json, created_at)
        VALUES (@id, @type, @role, @title, @content, @tags_json, @created_at)
      `,
    ).run({
      id: 'node-1',
      type: 'action',
      role: 'task',
      title: 'node one',
      content: 'content',
      tags_json: '["a","b"]',
      created_at: Date.now(),
    });

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM node_tags WHERE node_id = ?')
      .get('node-1') as {
      count: number;
    };
    expect(row.count).toBe(2);

    db.close();
  });

  it('does not add node_tags rows for empty tags array', () => {
    const db = createDatabase(':memory:');

    db.prepare(
      `
        INSERT INTO nodes (id, type, role, title, content, tags_json, created_at)
        VALUES (@id, @type, @role, @title, @content, @tags_json, @created_at)
      `,
    ).run({
      id: 'node-2',
      type: 'action',
      role: 'task',
      title: 'node two',
      content: 'content',
      tags_json: '[]',
      created_at: Date.now(),
    });

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM node_tags WHERE node_id = ?')
      .get('node-2') as {
      count: number;
    };
    expect(row.count).toBe(0);

    db.close();
  });

  it('syncs inserted nodes into FTS5 table', () => {
    const db = createDatabase(':memory:');

    db.prepare(
      `
        INSERT INTO nodes (id, type, role, title, content, tags_json, created_at)
        VALUES (@id, @type, @role, @title, @content, @tags_json, @created_at)
      `,
    ).run({
      id: 'node-3',
      type: 'action',
      role: 'task',
      title: 'fts title',
      content: 'fts content',
      tags_json: '["fts"]',
      created_at: Date.now(),
    });

    const row = db.prepare('SELECT rowid FROM nodes_fts WHERE rowid = 1').get() as
      | { rowid: number }
      | undefined;
    expect(row?.rowid).toBe(1);

    db.close();
  });
});
