import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

import { EdgeType, NodeType, type Edge, type Node } from './types.js';

export interface StoreNodeInput {
  type: NodeType;
  title: string;
  content: string;
  tags?: string[];
  importance?: number;
  confidence?: number;
  embedding?: Uint8Array | Buffer | null;
  anchor_to?: string[];
}

export interface GetNodeOptions {
  includeEdges?: boolean;
}

export type NodeWithEdges = Node & { edges: Edge[] };

type Statements = {
  insertNode: Database.Statement;
  getNode: Database.Statement;
  getNodeWithRowId: Database.Statement;
  getNodeEdges: Database.Statement;
  getInvalidationState: Database.Statement;
  setInvalidatedAt: Database.Statement;
  insertFileContextNode: Database.Statement;
  insertAnchoredEdge: Database.Statement;
};

const statementsByDb = new WeakMap<Database.Database, Statements>();

const getStatements = (db: Database.Database): Statements => {
  const cached = statementsByDb.get(db);
  if (cached) {
    return cached;
  }

  const statements: Statements = {
    insertNode: db.prepare(`
      INSERT INTO nodes (
        id,
        type,
        title,
        content,
        tags_json,
        importance,
        confidence,
        created_at,
        invalidated_at,
        embedding
      ) VALUES (
        @id,
        @type,
        @title,
        @content,
        @tags_json,
        @importance,
        @confidence,
        @created_at,
        @invalidated_at,
        @embedding
      )
    `),
    getNode: db.prepare(`
      SELECT
        id,
        type,
        title,
        content,
        tags_json,
        importance,
        confidence,
        created_at,
        invalidated_at,
        embedding
      FROM nodes
      WHERE id = ?
    `),
    getNodeWithRowId: db.prepare(`
      SELECT
        rowid,
        id,
        type,
        title,
        content,
        tags_json,
        importance,
        confidence,
        created_at,
        invalidated_at,
        embedding
      FROM nodes
      WHERE id = ?
    `),
    getNodeEdges: db.prepare(`
      SELECT id, source_id, target_id, type, strength, confidence, created_at
      FROM edges
      WHERE source_id = ? OR target_id = ?
      ORDER BY created_at ASC
    `),
    getInvalidationState: db.prepare('SELECT invalidated_at FROM nodes WHERE id = ?'),
    setInvalidatedAt: db.prepare(
      'UPDATE nodes SET invalidated_at = ? WHERE id = ? AND invalidated_at IS NULL',
    ),
    insertFileContextNode: db.prepare(`
      INSERT OR IGNORE INTO nodes (
        id,
        type,
        title,
        content,
        tags_json,
        importance,
        confidence,
        created_at,
        invalidated_at,
        embedding
      ) VALUES (
        @id,
        @type,
        @title,
        @content,
        @tags_json,
        @importance,
        @confidence,
        @created_at,
        @invalidated_at,
        @embedding
      )
    `),
    insertAnchoredEdge: db.prepare(`
      INSERT INTO edges (id, source_id, target_id, type, strength, confidence, created_at)
      VALUES (@id, @source_id, @target_id, @type, @strength, @confidence, @created_at)
    `),
  };

  statementsByDb.set(db, statements);
  return statements;
};

export const storeNode = (db: Database.Database, input: StoreNodeInput): Node => {
  const statements = getStatements(db);
  const now = Date.now();
  const node: Node = {
    id: nanoid(),
    type: input.type,
    title: input.title,
    content: input.content,
    tags_json: JSON.stringify(input.tags ?? []),
    importance: input.importance ?? 0.5,
    confidence: input.confidence ?? 0.8,
    created_at: now,
    invalidated_at: null,
    embedding: input.embedding ?? null,
  };

  const anchorTargets = input.anchor_to ?? [];

  db.transaction(() => {
    statements.insertNode.run(node);

    for (const anchorPath of anchorTargets) {
      const targetId = `file_context:${anchorPath}`;

      statements.insertFileContextNode.run({
        id: targetId,
        type: NodeType.FileContext,
        title: anchorPath,
        content: anchorPath,
        tags_json: '[]',
        importance: 0.5,
        confidence: 0.8,
        created_at: now,
        invalidated_at: null,
        embedding: null,
      });

      statements.insertAnchoredEdge.run({
        id: nanoid(),
        source_id: node.id,
        target_id: targetId,
        type: EdgeType.AnchoredTo,
        strength: 1,
        confidence: 1,
        created_at: now,
      });
    }
  }).immediate();

  return node;
};

export const getNode = (
  db: Database.Database,
  id: string,
  options?: GetNodeOptions,
): Node | NodeWithEdges | null => {
  const statements = getStatements(db);
  const node = statements.getNode.get(id) as Node | undefined;

  if (!node) {
    return null;
  }

  if (!options?.includeEdges) {
    return node;
  }

  const edges = statements.getNodeEdges.all(id, id) as Edge[];
  return { ...node, edges };
};

export const invalidateNode = (db: Database.Database, id: string): void => {
  const statements = getStatements(db);

  db.transaction(() => {
    const existing = statements.getInvalidationState.get(id) as
      | { invalidated_at: number | null }
      | undefined;
    if (!existing) {
      throw new Error(`Node not found: ${id}`);
    }

    if (existing.invalidated_at !== null) {
      return;
    }

    statements.setInvalidatedAt.run(Date.now(), id);
  }).immediate();
};
