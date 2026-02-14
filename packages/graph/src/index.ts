import type Database from 'better-sqlite3';

import { createDatabase } from './db.js';
import {
  createEdge as createEdgeImpl,
  deleteEdge as deleteEdgeImpl,
  getEdgesForNode as getEdgesForNodeImpl,
  type CreateEdgeInput,
  type CreateEdgeOptions,
  type EdgeDirection,
  type MinimalEdge,
} from './edges.js';
import { Embedder } from './embedder.js';
import {
  getNode as getNodeImpl,
  invalidateNode as invalidateNodeImpl,
  storeNode as storeNodeImpl,
  type GetNodeOptions,
  type MinimalNode,
  type NodeWithEdges,
  type SimilarNode,
  type StoreNodeInput,
  type StoreNodeOptions,
  type StoreNodeResult,
} from './nodes.js';
import {
  replaceNode as replaceNodeImpl,
  type ReplaceNodeInput,
  type ReplaceNodeOptions,
} from './replace-node.js';
import {
  detectSearchMode,
  search as searchImpl,
  searchBatch as searchBatchImpl,
} from './search.js';
import {
  about as aboutImpl,
  stats as statsImpl,
  traverse as traverseImpl,
  type AboutOptions,
  type Stats,
  type TraverseResult,
} from './traverse.js';
import {
  EdgeType,
  NodeRole,
  NodeScope,
  NodeStatus,
  NodeType,
  type Edge,
  type Node,
  type NodeTag,
  type SearchMode,
  type SearchOptions,
  type SearchResult,
  type TraverseOptions,
} from './types.js';

/**
 * Texere - Main database class for the Texere graph library
 *
 * Provides a high-level API for managing nodes, edges, search, and traversal operations.
 */
export class Texere {
  private db: Database.Database;
  private embedder: Embedder;

  constructor(dbPath: string) {
    this.db = createDatabase(dbPath);
    this.embedder = new Embedder(this.db);
  }

  storeNode(
    input: StoreNodeInput,
    options?: StoreNodeOptions & { minimal?: false },
  ): StoreNodeResult;
  storeNode(input: StoreNodeInput, options: StoreNodeOptions & { minimal: true }): MinimalNode;
  storeNode(input: StoreNodeInput[], options?: StoreNodeOptions & { minimal?: false }): Node[];
  storeNode(input: StoreNodeInput[], options: StoreNodeOptions & { minimal: true }): MinimalNode[];
  storeNode(
    input: StoreNodeInput | StoreNodeInput[],
    options?: StoreNodeOptions,
  ): StoreNodeResult | MinimalNode | Node[] | MinimalNode[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const result = (storeNodeImpl as any)(this.db, input, options);
    this.embedder.schedulePending();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }

  /**
   * Retrieve a node by ID
   * @param id - Node ID
   * @param options - Optional retrieval options
   * @returns The node if found, null otherwise
   */
  getNode(id: string, options?: GetNodeOptions): Node | NodeWithEdges | null {
    return getNodeImpl(this.db, id, options);
  }

  /**
   * Mark a node as invalidated
   * @param id - Node ID to invalidate
   * @throws Error if node not found
   */
  invalidateNode(id: string): void {
    invalidateNodeImpl(this.db, id);
  }

  replaceNode(input: ReplaceNodeInput, options?: ReplaceNodeOptions & { minimal?: false }): Node;
  replaceNode(
    input: ReplaceNodeInput,
    options: ReplaceNodeOptions & { minimal: true },
  ): MinimalNode;
  replaceNode(input: ReplaceNodeInput, options?: ReplaceNodeOptions): Node | MinimalNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const result = (replaceNodeImpl as any)(this.db, input, options);
    this.embedder.schedulePending();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }

  createEdge(input: CreateEdgeInput, options?: CreateEdgeOptions & { minimal?: false }): Edge;
  createEdge(input: CreateEdgeInput, options: CreateEdgeOptions & { minimal: true }): MinimalEdge;
  createEdge(input: CreateEdgeInput[], options?: CreateEdgeOptions & { minimal?: false }): Edge[];
  createEdge(
    input: CreateEdgeInput[],
    options: CreateEdgeOptions & { minimal: true },
  ): MinimalEdge[];
  createEdge(
    input: CreateEdgeInput | CreateEdgeInput[],
    options?: CreateEdgeOptions,
  ): Edge | MinimalEdge | Edge[] | MinimalEdge[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return (createEdgeImpl as any)(this.db, input, options);
  }

  /**
   * Delete an edge by ID
   * @param id - Edge ID to delete
   * @returns true if edge was deleted, false if not found
   */
  deleteEdge(id: string): boolean {
    return deleteEdgeImpl(this.db, id);
  }

  /**
   * Get all edges for a node
   * @param nodeId - Node ID
   * @param direction - Edge direction ('outgoing', 'incoming', or 'both')
   * @returns Array of edges
   */
  getEdgesForNode(nodeId: string, direction: EdgeDirection): Edge[] {
    return getEdgesForNodeImpl(this.db, nodeId, direction);
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const mode =
      options.mode && options.mode !== 'auto' ? options.mode : detectSearchMode(options.query);

    if (mode === 'semantic' || mode === 'hybrid') {
      await this.embedder.flushPending();
      const queryEmbedding = await this.embedder.embed(options.query);
      return searchImpl(this.db, options, queryEmbedding);
    }

    return searchImpl(this.db, options);
  }

  searchBatch(queries: SearchOptions[]): SearchResult[][] {
    return searchBatchImpl(this.db, queries);
  }

  /**
   * Traverse the graph from a starting node
   * @param options - Traversal options
   * @returns Array of traverse results with depth information
   */
  traverse(options: TraverseOptions): TraverseResult[] {
    return traverseImpl(this.db, options);
  }

  /**
   * Search and traverse - find nodes matching search criteria and their neighbors
   * @param options - Combined search and traversal options
   * @returns Array of traverse results with depth information
   */
  async about(options: AboutOptions): Promise<TraverseResult[]> {
    const mode =
      options.mode && options.mode !== 'auto' ? options.mode : detectSearchMode(options.query);

    if (mode === 'semantic' || mode === 'hybrid') {
      await this.embedder.flushPending();
      const queryEmbedding = await this.embedder.embed(options.query);
      return aboutImpl(this.db, options, queryEmbedding);
    }

    return aboutImpl(this.db, options);
  }

  /**
   * Get database statistics
   * @returns Statistics about nodes and edges
   */
  stats(): Stats {
    return statsImpl(this.db);
  }

  close(): void {
    this.embedder.destroy();
    this.db.close();
  }
}

export type {
  Node,
  NodeWithEdges,
  StoreNodeInput,
  StoreNodeOptions,
  StoreNodeResult,
  SimilarNode,
  MinimalNode,
  GetNodeOptions,
  ReplaceNodeInput,
  ReplaceNodeOptions,
  Edge,
  CreateEdgeInput,
  CreateEdgeOptions,
  MinimalEdge,
  EdgeDirection,
  SearchMode,
  SearchOptions,
  SearchResult,
  TraverseOptions,
  TraverseResult,
  AboutOptions,
  Stats,
  NodeTag,
};

export { EdgeType, NodeRole, NodeScope, NodeStatus, NodeType };
export { isValidTypeRole, VALID_ROLES_BY_TYPE } from './types.js';
export { sanitizeFtsQueryStrict } from './sanitize.js';
