import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDatabase } from './db.js';
import { storeNode } from './nodes.js';
import { NodeRole, NodeType } from './types.js';

const transformersMock = vi.hoisted(() => {
  return {
    env: { cacheDir: '' },
    pipeline: vi.fn(),
  };
});

vi.mock('@huggingface/transformers', () => ({
  env: transformersMock.env,
  pipeline: transformersMock.pipeline,
}));

describe('Embedder pipeline contract', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    transformersMock.env.cacheDir = '';
    transformersMock.pipeline.mockReset();
  });

  afterEach(() => {
    db.close();
    vi.useRealTimers();
  });

  it('configures and caches the feature extraction pipeline across embed calls', async () => {
    const pipe = vi.fn().mockResolvedValue({ data: new Float32Array(384).fill(0.5) });
    transformersMock.pipeline.mockResolvedValue(pipe);

    const { Embedder } = await import('./embedder.js');
    const embedder = new Embedder(db);

    const [first, second] = await Promise.all([
      embedder.embed('first text'),
      embedder.embed('second text'),
    ]);

    expect(transformersMock.pipeline).toHaveBeenCalledTimes(1);
    expect(transformersMock.pipeline).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    );
    expect(transformersMock.env.cacheDir).toContain('.cache');
    expect(transformersMock.env.cacheDir).toContain('texere');
    expect(transformersMock.env.cacheDir).toContain('models');
    expect(pipe).toHaveBeenNthCalledWith(1, 'first text', { pooling: 'mean', normalize: true });
    expect(pipe).toHaveBeenNthCalledWith(2, 'second text', { pooling: 'mean', normalize: true });
    expect(first).toBeInstanceOf(Float32Array);
    expect(second).toBeInstanceOf(Float32Array);
  });

  it('returns one sliced embedding per input in batch mode', async () => {
    const data = new Float32Array(384 * 2);
    data.fill(1, 0, 384);
    data.fill(2, 384, 768);
    const pipe = vi.fn().mockResolvedValue({ data });
    transformersMock.pipeline.mockResolvedValue(pipe);

    const { Embedder, EMBEDDING_DIM } = await import('./embedder.js');
    const embedder = new Embedder(db);

    const results = await embedder.embedBatch(['alpha', 'beta']);

    expect(pipe).toHaveBeenCalledWith(['alpha', 'beta'], { pooling: 'mean', normalize: true });
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveLength(EMBEDDING_DIM);
    expect(results[1]).toHaveLength(EMBEDDING_DIM);
    expect(Array.from(results[0]!.slice(0, 3))).toEqual([1, 1, 1]);
    expect(Array.from(results[1]!.slice(0, 3))).toEqual([2, 2, 2]);
  });

  it('returns early for empty batches without loading the pipeline', async () => {
    const { Embedder } = await import('./embedder.js');
    const embedder = new Embedder(db);

    await expect(embedder.embedBatch([])).resolves.toEqual([]);
    expect(transformersMock.pipeline).not.toHaveBeenCalled();
  });

  it('destroy cancels scheduled embedding work before the timer fires', async () => {
    vi.useFakeTimers();
    const pipe = vi.fn().mockResolvedValue({ data: new Float32Array(384).fill(0.25) });
    transformersMock.pipeline.mockResolvedValue(pipe);

    const { Embedder } = await import('./embedder.js');
    const embedder = new Embedder(db, 50);
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Scheduled node',
      content: 'Pending embedding work',
    });

    embedder.schedulePending();
    embedder.destroy();
    await vi.advanceTimersByTimeAsync(60);

    const row = db.prepare('SELECT node_id FROM nodes_vec WHERE node_id = ?').get(node.id);
    expect(row).toBeUndefined();
    expect(transformersMock.pipeline).not.toHaveBeenCalled();
  });

  it('embedNode stores an embedding only for an active node', async () => {
    const pipe = vi.fn().mockResolvedValue({ data: new Float32Array(384).fill(0.75) });
    transformersMock.pipeline.mockResolvedValue(pipe);

    const { Embedder } = await import('./embedder.js');
    const embedder = new Embedder(db);
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Node to embed',
      content: 'Embedding content',
      tags: ['intent'],
    });

    await embedder.embedNode(node.id);

    const row = db.prepare('SELECT node_id FROM nodes_vec WHERE node_id = ?').get(node.id) as
      | { node_id: string }
      | undefined;
    expect(row).toEqual({ node_id: node.id });
    expect(pipe).toHaveBeenCalledTimes(1);
  });

  it('embedPending embeds only active rows that do not already have embeddings', async () => {
    const data = new Float32Array(384 * 2);
    data.fill(3, 0, 384);
    data.fill(4, 384, 768);
    const pipe = vi.fn().mockResolvedValue({ data });
    transformersMock.pipeline.mockResolvedValue(pipe);

    const { Embedder } = await import('./embedder.js');
    const embedder = new Embedder(db);
    const first = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'First pending node',
      content: 'First content',
      tags: ['alpha'],
    });
    const second = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Second pending node',
      content: 'Second content',
      tags: ['beta'],
    });
    const alreadyEmbedded = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Embedded already',
      content: 'Skip me',
      tags: ['gamma'],
    });

    db.prepare('INSERT INTO nodes_vec(node_id, embedding) VALUES (?, ?)').run(
      alreadyEmbedded.id,
      Buffer.from(new Float32Array(384).buffer),
    );

    const count = await embedder.embedPending();

    const rows = db.prepare('SELECT node_id FROM nodes_vec ORDER BY node_id ASC').all() as Array<{
      node_id: string;
    }>;
    expect(count).toBe(2);
    expect(pipe).toHaveBeenCalledTimes(1);
    expect(rows.map((row) => row.node_id).sort()).toEqual(
      [alreadyEmbedded.id, first.id, second.id].sort(),
    );
  });

  it('schedulePending replaces an existing timer and performs one batch when it fires', async () => {
    vi.useFakeTimers();
    const data = new Float32Array(384 * 2);
    data.fill(5, 0, 384);
    data.fill(6, 384, 768);
    const pipe = vi.fn().mockResolvedValue({ data });
    transformersMock.pipeline.mockResolvedValue(pipe);

    const { Embedder } = await import('./embedder.js');
    const embedder = new Embedder(db, 25);
    storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'First queued node',
      content: 'Queued first content',
      tags: ['first'],
    });
    storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Second queued node',
      content: 'Queued second content',
      tags: ['second'],
    });

    embedder.schedulePending();
    embedder.schedulePending();

    await vi.advanceTimersByTimeAsync(30);

    const row = db.prepare('SELECT COUNT(*) AS count FROM nodes_vec').get() as { count: number };
    expect(pipe).toHaveBeenCalledTimes(1);
    expect(row.count).toBe(2);
  });

  it('flushPending cancels the timer and performs the pending embed work immediately', async () => {
    vi.useFakeTimers();
    const pipe = vi.fn().mockResolvedValue({ data: new Float32Array(384).fill(0.9) });
    transformersMock.pipeline.mockResolvedValue(pipe);

    const { Embedder } = await import('./embedder.js');
    const embedder = new Embedder(db, 25);
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Immediate node',
      content: 'Flush right away',
      tags: ['flush'],
    });

    embedder.schedulePending();
    await embedder.flushPending();
    await vi.advanceTimersByTimeAsync(30);

    const row = db.prepare('SELECT node_id FROM nodes_vec WHERE node_id = ?').get(node.id) as
      | { node_id: string }
      | undefined;
    expect(row).toEqual({ node_id: node.id });
    expect(pipe).toHaveBeenCalledTimes(1);
  });
});
