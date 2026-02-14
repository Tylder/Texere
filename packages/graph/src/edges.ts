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

export interface CreateEdgeOptions {
  minimal?: boolean;
}

export type MinimalEdge = Pick<Edge, 'id'>;

export type EdgeDirection = 'outgoing' | 'incoming' | 'both';

const MAX_BATCH_SIZE = 50;

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
    invalidateNode: db.prepare(
      'UPDATE nodes SET invalidated_at = ? WHERE id = ? AND invalidated_at IS NULL',
    ),
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

// Single input overloads
export function createEdge(
  db: Database.Database,
  input: CreateEdgeInput,
  options?: CreateEdgeOptions & { minimal?: false },
): Edge;
export function createEdge(
  db: Database.Database,
  input: CreateEdgeInput,
  options: CreateEdgeOptions & { minimal: true },
): MinimalEdge;

// Array input overloads
export function createEdge(
  db: Database.Database,
  input: CreateEdgeInput[],
  options?: CreateEdgeOptions & { minimal?: false },
): Edge[];
export function createEdge(
  db: Database.Database,
  input: CreateEdgeInput[],
  options: CreateEdgeOptions & { minimal: true },
): MinimalEdge[];

// Implementation
export function createEdge(
  db: Database.Database,
  input: CreateEdgeInput | CreateEdgeInput[],
  options?: CreateEdgeOptions,
): Edge | MinimalEdge | Edge[] | MinimalEdge[] {
  const isBatch = Array.isArray(input);
  const inputs = isBatch ? input : [input];

  if (inputs.length === 0) {
    throw new Error('at least one edge required');
  }
  if (inputs.length > MAX_BATCH_SIZE) {
    throw new Error(`max batch size exceeded (${MAX_BATCH_SIZE})`);
  }

  const statements = getStatements(db);
  const now = Date.now();

  const edges: Edge[] = inputs.map((inp) => ({
    id: nanoid(),
    source_id: inp.source_id,
    target_id: inp.target_id,
    type: inp.type,
    strength: inp.strength ?? 0.5,
    confidence: inp.confidence ?? 0.8,
    created_at: now,
  }));

  db.transaction(() => {
    for (const edge of edges) {
      statements.insertEdge.run(edge);

      if (edge.type === EdgeType.Replaces) {
        statements.invalidateNode.run(now, edge.source_id);
      }
    }
  }).immediate();

  const minimal = options?.minimal ?? false;

  if (minimal) {
    const result = edges.map((e) => ({ id: e.id }));
    return isBatch ? result : result[0]!;
  }

  return isBatch ? edges : edges[0]!;
}

export const deleteEdge = (db: Database.Database, id: string): boolean => {
  const statements = getStatements(db);
  const result = statements.deleteEdge.run(id);
  return result.changes > 0;
};

export const getEdgesForNode = (
  db: Database.Database,
  nodeId: string,
  direction: EdgeDirection,
): Edge[] => {
  const statements = getStatements(db);

  if (direction === 'outgoing') {
    return statements.getOutgoing.all(nodeId) as Edge[];
  }

  if (direction === 'incoming') {
    return statements.getIncoming.all(nodeId) as Edge[];
  }

  return statements.getBoth.all(nodeId, nodeId) as Edge[];
};
