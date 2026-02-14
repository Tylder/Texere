import { homedir } from 'node:os';
import { join } from 'node:path';

import type Database from 'better-sqlite3';

import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

export const EMBEDDING_DIM = 384;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const DEFAULT_DEBOUNCE_MS = 10_000;
export class Embedder {
  private db: Database.Database;
  private debounceMs: number;
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: Database.Database, debounceMs = DEFAULT_DEBOUNCE_MS) {
    this.db = db;
    this.debounceMs = debounceMs;
  }

  private getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      env.cacheDir = join(homedir(), '.cache', 'texere', 'models');
      this.pipelinePromise = pipeline('feature-extraction', MODEL_ID);
    }
    return this.pipelinePromise;
  }

  async embed(text: string): Promise<Float32Array> {
    const pipe = await this.getPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const pipe = await this.getPipeline();
    const output = await pipe(texts, { pooling: 'mean', normalize: true });
    const data = output.data as Float32Array;
    const results: Float32Array[] = [];
    for (let i = 0; i < texts.length; i++) {
      results.push(data.slice(i * EMBEDDING_DIM, (i + 1) * EMBEDDING_DIM));
    }
    return results;
  }

  async embedNode(nodeId: string): Promise<void> {
    const row = this.db
      .prepare('SELECT title, content FROM nodes WHERE id = ? AND invalidated_at IS NULL')
      .get(nodeId) as { title: string; content: string } | undefined;

    if (!row) return;

    const text = `${row.title} ${row.content}`;
    const embedding = await this.embed(text);

    this.db
      .prepare('INSERT OR IGNORE INTO nodes_vec(node_id, embedding) VALUES (?, ?)')
      .run(nodeId, Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength));
  }

  async embedPending(): Promise<number> {
    const pending = this.db
      .prepare(
        `SELECT n.id, n.title, n.content FROM nodes n
         LEFT JOIN nodes_vec nv ON n.id = nv.node_id
         WHERE nv.node_id IS NULL AND n.invalidated_at IS NULL`,
      )
      .all() as Array<{ id: string; title: string; content: string }>;

    if (pending.length === 0) return 0;

    const texts = pending.map((row) => `${row.title} ${row.content}`);
    const embeddings = await this.embedBatch(texts);

    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO nodes_vec(node_id, embedding) VALUES (?, ?)',
    );

    this.db
      .transaction(() => {
        for (let i = 0; i < pending.length; i++) {
          const emb = embeddings[i]!;
          insert.run(pending[i]!.id, Buffer.from(emb.buffer, emb.byteOffset, emb.byteLength));
        }
      })
      .immediate();

    return pending.length;
  }

  schedulePending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.embedPending();
    }, this.debounceMs);
  }

  async flushPending(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.embedPending();
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pipelinePromise = null;
  }
}
