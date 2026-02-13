import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

import { EdgeType, type Edge } from './types.js';

export interface CreateEdgeInput {
  source_id: string;
  target_id: string;
  type: EdgeType;
  strength?: number;
  confidence?: number;
}

export type EdgeDirection = 'outgoing' | 'incoming' | 'both';

type Statements = {
  insertEdge: Database.Statement;
  invalidateNode: Database.Statement;
  deleteEdge: Database.Statement;
  getOutgoing: Database.Statement;
  getIncoming: Database.Statement;
  getBoth: Database.Statement;
};

const statementsByDb = new WeakMap<Database.Database, Statements>();

const getStatements = (db: Database.Database): Statements => {
  const cached = statementsByDb.get(db);
  if (cached) {
    return cached;
  }

  const statements: Statements = {
    insertEdge: db.prepare(`
      INSERT INTO edges (id, source_id, target_id, type, strength, confidence, created_at)
      VALUES (@id, @source_id, @target_id, @type, @strength, @confidence, @created_at)
    `),
    invalidateNode: db.prepare('UPDATE nodes SET invalidated_at = ? WHERE id = ? AND invalidated_at IS NULL'),
    deleteEdge: db.prepare('DELETE FROM edges WHERE id = ?'),
    getOutgoing: db.prepare(`
      SELECT id, source_id, target_id, type, strength, confidence, created_at
      FROM edges
      WHERE source_id = ?
      ORDER BY created_at ASC
    `),
    getIncoming: db.prepare(`
      SELECT id, source_id, target_id, type, strength, confidence, created_at
      FROM edges
      WHERE target_id = ?
      ORDER BY created_at ASC
    `),
    getBoth: db.prepare(`
      SELECT id, source_id, target_id, type, strength, confidence, created_at
      FROM edges
      WHERE source_id = ? OR target_id = ?
      ORDER BY created_at ASC
    `),
  };

  statementsByDb.set(db, statements);
  return statements;
};

export const createEdge = (db: Database.Database, input: CreateEdgeInput): Edge => {
  const statements = getStatements(db);
  const edge: Edge = {
    id: nanoid(),
    source_id: input.source_id,
    target_id: input.target_id,
    type: input.type,
    strength: input.strength ?? 0.5,
    confidence: input.confidence ?? 0.8,
    created_at: Date.now(),
  };

  db.transaction(() => {
    statements.insertEdge.run(edge);

    if (edge.type === EdgeType.DeprecatedBy) {
      statements.invalidateNode.run(Date.now(), edge.source_id);
    }
  }).immediate();

  return edge;
};

export const deleteEdge = (db: Database.Database, id: string): boolean => {
  const statements = getStatements(db);
  const result = statements.deleteEdge.run(id);
  return result.changes > 0;
};

export const getEdgesForNode = (db: Database.Database, nodeId: string, direction: EdgeDirection): Edge[] => {
  const statements = getStatements(db);

  if (direction === 'outgoing') {
    return statements.getOutgoing.all(nodeId) as Edge[];
  }

  if (direction === 'incoming') {
    return statements.getIncoming.all(nodeId) as Edge[];
  }

  return statements.getBoth.all(nodeId, nodeId) as Edge[];
};
