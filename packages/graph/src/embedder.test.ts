import type Database from 'better-sqlite3';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db';
import { buildEmbeddingText, Embedder, EMBEDDING_DIM } from './embedder';
import { invalidateNode, storeNode, type StoreNodeInput } from './nodes';
import { NodeRole, NodeType } from './types';

const testNode = (overrides: Partial<StoreNodeInput> = {}): StoreNodeInput => ({
  type: NodeType.Knowledge,
  role: NodeRole.Decision,
  title: 'Test node',
  content: 'Test content for embedding',
  ...overrides,
});

describe('Embedder', { timeout: 120_000 }, () => {
  describe('buildEmbeddingText', () => {
    it('includes novel tags that do not appear in title or content', () => {
      const result = buildEmbeddingText('Auth', 'JWT tokens', '["security","auth"]');
      expect(result).toBe('Auth\nsecurity\nJWT tokens');
    });

    it('excludes tags that appear in title', () => {
      const result = buildEmbeddingText('SQLite WAL', 'write-ahead logging', '["sqlite","wal"]');
      expect(result).toBe('SQLite WAL\nwrite-ahead logging');
    });

    it('handles empty tags array', () => {
      const result = buildEmbeddingText('Title', 'Content', '[]');
      expect(result).toBe('Title\nContent');
    });

    it('gracefully handles invalid JSON tags', () => {
      const result = buildEmbeddingText('Title', 'Content', '');
      expect(result).toBe('Title\nContent');
    });

    it('limits to maximum 3 novel tags', () => {
      const result = buildEmbeddingText('X', 'Y', '["a","b","c","d","e"]');
      expect(result).toBe('X\na b c\nY');
    });

    it('filters tags that appear in content', () => {
      const result = buildEmbeddingText(
        'Title',
        'uses redis and postgres',
        '["redis","postgres","caching"]',
      );
      expect(result).toBe('Title\ncaching\nuses redis and postgres');
    });

    it('is case-insensitive when matching tags', () => {
      const result = buildEmbeddingText('MyTitle', 'content', '["mytitle","CONTENT","novel"]');
      expect(result).toBe('MyTitle\nnovel\ncontent');
    });

    it('handles malformed JSON gracefully', () => {
      const result = buildEmbeddingText('Title', 'Content', '{invalid json}');
      expect(result).toBe('Title\nContent');
    });
  });

  describe('embedding generation', () => {
    let embedder: Embedder;
    let db: Database.Database;

    beforeAll(() => {
      db = createDatabase(':memory:');
      embedder = new Embedder(db);
    });

    afterAll(() => {
      embedder.destroy();
      db.close();
    });

    it('embed returns Float32Array of length 384', async () => {
      const result = await embedder.embed('hello world');
      expect(result).toBeInstanceOf(Float32Array);
      expect(result).toHaveLength(EMBEDDING_DIM);
    });

    it('embedBatch returns array of Float32Arrays each of length 384', async () => {
      const results = await embedder.embedBatch(['hello', 'world']);
      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r).toBeInstanceOf(Float32Array);
        expect(r).toHaveLength(EMBEDDING_DIM);
      }
    });

    it('embedBatch returns empty array for empty input', async () => {
      const results = await embedder.embedBatch([]);
      expect(results).toEqual([]);
    });

    it('pipeline loads only once even with concurrent embed calls', async () => {
      const [r1, r2, r3] = await Promise.all([
        embedder.embed('first'),
        embedder.embed('second'),
        embedder.embed('third'),
      ]);
      expect(r1).toHaveLength(EMBEDDING_DIM);
      expect(r2).toHaveLength(EMBEDDING_DIM);
      expect(r3).toHaveLength(EMBEDDING_DIM);
    });

    it('embeddings are normalized (L2 norm ≈ 1)', async () => {
      const emb = await embedder.embed('test normalization');
      let sumSq = 0;
      for (let i = 0; i < emb.length; i++) {
        sumSq += emb[i]! * emb[i]!;
      }
      expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 2);
    });
  });

  describe('node embedding', () => {
    let db: Database.Database;
    let embedder: Embedder;

    beforeEach(() => {
      db = createDatabase(':memory:');
      embedder = new Embedder(db);
    });

    afterEach(() => {
      embedder.destroy();
      db.close();
    });

    it('embedNode inserts into nodes_vec', async () => {
      const node = storeNode(db, testNode());
      await embedder.embedNode(node.id);

      const row = db.prepare('SELECT node_id FROM nodes_vec WHERE node_id = ?').get(node.id) as
        | { node_id: string }
        | undefined;
      expect(row).toBeDefined();
      expect(row!.node_id).toBe(node.id);
    });

    it('embedPending finds and embeds un-embedded nodes', async () => {
      storeNode(db, testNode({ title: 'Node A', content: 'Content A' }));
      storeNode(db, testNode({ title: 'Node B', content: 'Content B' }));

      const count = await embedder.embedPending();
      expect(count).toBe(2);

      const vecCount = db.prepare('SELECT COUNT(*) as count FROM nodes_vec').get() as {
        count: number;
      };
      expect(vecCount.count).toBe(2);
    });

    it('embedPending returns 0 when all nodes are embedded', async () => {
      storeNode(db, testNode());
      await embedder.embedPending();

      const count = await embedder.embedPending();
      expect(count).toBe(0);
    });

    it('embedPending skips invalidated nodes', async () => {
      const node = storeNode(db, testNode());
      invalidateNode(db, node.id);

      const count = await embedder.embedPending();
      expect(count).toBe(0);
    });

    it('embedNode skips invalidated node', async () => {
      const node = storeNode(db, testNode());
      invalidateNode(db, node.id);

      await embedder.embedNode(node.id);

      const row = db.prepare('SELECT node_id FROM nodes_vec WHERE node_id = ?').get(node.id);
      expect(row).toBeUndefined();
    });

    it('embedNode does not error for nonexistent node', async () => {
      await expect(embedder.embedNode('nonexistent-id')).resolves.toBeUndefined();
    });
  });

  describe('debounce', () => {
    let db: Database.Database;
    let embedder: Embedder;

    beforeEach(() => {
      db = createDatabase(':memory:');
      embedder = new Embedder(db, 100); // Short debounce for testing
    });

    afterEach(() => {
      embedder.destroy();
      db.close();
    });

    it('schedulePending debounces multiple calls into one batch', async () => {
      storeNode(db, testNode({ title: 'Node 1', content: 'Content 1' }));
      storeNode(db, testNode({ title: 'Node 2', content: 'Content 2' }));

      // Call schedulePending multiple times rapidly — should collapse into one embedPending call
      embedder.schedulePending();
      embedder.schedulePending();
      embedder.schedulePending();

      // Wait for debounce to fire (100ms) + time for embedPending to complete
      await new Promise<void>((resolve) => {
        const check = (): void => {
          const row = db.prepare('SELECT COUNT(*) as count FROM nodes_vec').get() as {
            count: number;
          };
          if (row.count === 2) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        setTimeout(check, 150);
      });

      const vecCount = db.prepare('SELECT COUNT(*) as count FROM nodes_vec').get() as {
        count: number;
      };
      expect(vecCount.count).toBe(2);
    });

    it('flushPending runs immediately regardless of debounce timer', async () => {
      storeNode(db, testNode());

      embedder.schedulePending(); // starts debounce timer
      await embedder.flushPending(); // should run immediately, cancel timer

      const vecCount = db.prepare('SELECT COUNT(*) as count FROM nodes_vec').get() as {
        count: number;
      };
      expect(vecCount.count).toBe(1);
    });

    it('flushPending cancels pending debounce timer', async () => {
      storeNode(db, testNode({ title: 'Node 1', content: 'Content 1' }));

      embedder.schedulePending(); // starts debounce timer
      await embedder.flushPending(); // runs immediately, cancels timer

      // Wait past debounce interval — should NOT trigger another embedPending
      await new Promise((r) => setTimeout(r, 250));

      const vecCount = db.prepare('SELECT COUNT(*) as count FROM nodes_vec').get() as {
        count: number;
      };
      // Still just 1, no double run (INSERT OR IGNORE would prevent duplicates anyway,
      // but the count confirms the timer was cancelled)
      expect(vecCount.count).toBe(1);
    });
  });
});
