import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

import { sanitizeFtsQueryStrict } from './sanitize.js';
import { EdgeType, NodeRole, NodeType, isValidTypeRole, type Edge, type Node } from './types.js';

export interface StoreNodeInput {
  type: NodeType;
  role: NodeRole;
  title: string;
  content: string;
  tags?: string[];
  importance?: number;
  confidence?: number;
  anchor_to?: string[];
  sources?: string[];
}

export interface StoreNodeOptions {
  minimal?: boolean;
}

export interface GetNodeOptions {
  includeEdges?: boolean;
}

export type MinimalNode = Pick<Node, 'id'>;

export interface SimilarNode {
  id: string;
  title: string;
  type: NodeType;
  role: NodeRole;
}

export type StoreNodeResult = Node & { warning?: { similar_nodes: SimilarNode[] } };

export type NodeWithEdges = Node & { edges: Edge[] };

const MAX_BATCH_SIZE = 50;

const NODE_COLUMNS = `id, type, role, title, content, tags_json,
    importance, confidence,
    created_at, invalidated_at`;

const NODE_PARAMS = `@id, @type, @role, @title, @content, @tags_json,
    @importance, @confidence,
    @created_at, @invalidated_at`;

type Statements = {
  insertNode: Database.Statement;
  getNode: Database.Statement;
  getNodeWithRowId: Database.Statement;
  getNodeEdges: Database.Statement;
  getInvalidationState: Database.Statement;
  setInvalidatedAt: Database.Statement;
  insertFileContextNode: Database.Statement;
  insertAnchoredEdge: Database.Statement;
  searchSimilarTitle: Database.Statement;
};

const statementsByDb = new WeakMap<Database.Database, Statements>();

const getStatements = (db: Database.Database): Statements => {
  const cached = statementsByDb.get(db);
  if (cached) {
    return cached;
  }

  const statements: Statements = {
    insertNode: db.prepare(`
      INSERT INTO nodes (${NODE_COLUMNS}) VALUES (${NODE_PARAMS})
    `),
    getNode: db.prepare(`
      SELECT ${NODE_COLUMNS} FROM nodes WHERE id = ?
    `),
    getNodeWithRowId: db.prepare(`
      SELECT rowid, ${NODE_COLUMNS} FROM nodes WHERE id = ?
    `),
    getNodeEdges: db.prepare(`
      SELECT id, source_id, target_id, type, created_at
      FROM edges
      WHERE source_id = ? OR target_id = ?
      ORDER BY created_at ASC
    `),
    getInvalidationState: db.prepare('SELECT invalidated_at FROM nodes WHERE id = ?'),
    setInvalidatedAt: db.prepare(
      'UPDATE nodes SET invalidated_at = ? WHERE id = ? AND invalidated_at IS NULL',
    ),
    insertFileContextNode: db.prepare(`
      INSERT OR IGNORE INTO nodes (${NODE_COLUMNS}) VALUES (${NODE_PARAMS})
    `),
    insertAnchoredEdge: db.prepare(`
      INSERT INTO edges (id, source_id, target_id, type, created_at)
      VALUES (@id, @source_id, @target_id, @type, @created_at)
    `),
    searchSimilarTitle: db.prepare(`
      SELECT n.id, n.title, n.type, n.role
      FROM nodes n
      WHERE n.rowid IN (
        SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ?
      )
      AND n.invalidated_at IS NULL
      LIMIT 5
    `),
  };

  statementsByDb.set(db, statements);
  return statements;
};

const buildNode = (input: StoreNodeInput, now: number): Node => ({
  id: nanoid(),
  type: input.type,
  role: input.role,
  title: input.title,
  content: input.content,
  tags_json: JSON.stringify(input.tags ?? []),
  importance: input.importance ?? 0.5,
  confidence: input.confidence ?? 0.8,
  created_at: now,
  invalidated_at: null,
});

const insertNodeWithAnchors = (
  statements: Statements,
  node: Node,
  anchorPaths: string[],
  sources: string[],
  now: number,
): void => {
  statements.insertNode.run(node);

  for (const anchorPath of anchorPaths) {
    const targetId = `file_context:${anchorPath}`;

    statements.insertFileContextNode.run({
      id: targetId,
      type: NodeType.Artifact,
      role: 'file_context' as NodeRole, // internal-only role, not in public NodeRole enum
      title: anchorPath,
      content: anchorPath,
      tags_json: '[]',
      importance: 0.5,
      confidence: 0.8,
      created_at: now,
      invalidated_at: null,
    });

    statements.insertAnchoredEdge.run({
      id: nanoid(),
      source_id: node.id,
      target_id: targetId,
      type: EdgeType.AnchoredTo,
      created_at: now,
    });
  }

  for (const source of sources) {
    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    const sourceNodeId = isUrl ? `source:web:${source}` : `source:file:${source}`;
    const sourceRole = isUrl ? NodeRole.WebUrl : NodeRole.FilePath;

    statements.insertFileContextNode.run({
      id: sourceNodeId,
      type: NodeType.Source,
      role: sourceRole,
      title: source,
      content: source,
      tags_json: '[]',
      importance: 0.5,
      confidence: 1.0,
      created_at: now,
      invalidated_at: null,
    });

    statements.insertAnchoredEdge.run({
      id: nanoid(),
      source_id: node.id,
      target_id: sourceNodeId,
      type: EdgeType.BasedOn,
      created_at: now,
    });
  }
};

const findSimilarNodes = (statements: Statements, title: string): SimilarNode[] | undefined => {
  const sanitized = sanitizeFtsQueryStrict(title);
  if (sanitized.length === 0) {
    return undefined;
  }

  const titleQuery = sanitized
    .split(/\s+/)
    .map((t) => `title:${t}`)
    .join(' ');

  try {
    const similar = statements.searchSimilarTitle.all(titleQuery) as SimilarNode[];
    return similar.length > 0 ? similar : undefined;
  } catch {
    // FTS5 query errors are non-blocking for duplicate detection
    return undefined;
  }
};

// Single input overloads
export function storeNode(
  db: Database.Database,
  input: StoreNodeInput,
  options?: StoreNodeOptions & { minimal?: false },
): StoreNodeResult;
export function storeNode(
  db: Database.Database,
  input: StoreNodeInput,
  options: StoreNodeOptions & { minimal: true },
): MinimalNode;

// Batch input overloads
export function storeNode(
  db: Database.Database,
  input: StoreNodeInput[],
  options?: StoreNodeOptions & { minimal?: false },
): Node[];
export function storeNode(
  db: Database.Database,
  input: StoreNodeInput[],
  options: StoreNodeOptions & { minimal: true },
): MinimalNode[];

// Implementation
export function storeNode(
  db: Database.Database,
  input: StoreNodeInput | StoreNodeInput[],
  options?: StoreNodeOptions,
): StoreNodeResult | MinimalNode | Node[] | MinimalNode[] {
  const isBatch = Array.isArray(input);
  const inputs = isBatch ? input : [input];

  if (inputs.length === 0) {
    throw new Error('at least one node required');
  }
  if (inputs.length > MAX_BATCH_SIZE) {
    throw new Error(`max batch size exceeded (${MAX_BATCH_SIZE})`);
  }

  // Pre-validate all type-role combinations before opening transaction
  for (const inp of inputs) {
    if (!isValidTypeRole(inp.type, inp.role)) {
      throw new Error(`invalid type-role combination: type="${inp.type}" role="${inp.role}"`);
    }
  }

  const statements = getStatements(db);
  const now = Date.now();
  const minimal = options?.minimal ?? false;

  // Duplicate warning: single, non-minimal, no anchor_to only
  let similarNodes: SimilarNode[] | undefined;
  if (!isBatch && !minimal) {
    const singleInput = inputs[0]!;
    const hasAnchors = (singleInput.anchor_to?.length ?? 0) > 0;
    if (!hasAnchors) {
      similarNodes = findSimilarNodes(statements, singleInput.title);
    }
  }

  const nodes: Node[] = inputs.map((inp) => buildNode(inp, now));

  db.transaction(() => {
    for (let i = 0; i < nodes.length; i++) {
      insertNodeWithAnchors(
        statements,
        nodes[i]!,
        inputs[i]!.anchor_to ?? [],
        inputs[i]!.sources ?? [],
        now,
      );
    }
  }).immediate();

  if (isBatch) {
    if (minimal) {
      return nodes.map((n) => ({ id: n.id }));
    }
    return nodes;
  }

  if (minimal) {
    return { id: nodes[0]!.id };
  }

  if (similarNodes) {
    return { ...nodes[0]!, warning: { similar_nodes: similarNodes } };
  }

  return nodes[0]! as StoreNodeResult;
}

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
