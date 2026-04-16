// Core node types (5 values)
export enum NodeType {
  Knowledge = 'knowledge',
  Issue = 'issue',
  Action = 'action',
  Artifact = 'artifact',
  Source = 'source',
}

// Node roles (20 values) - constrained by type
export enum NodeRole {
  // Knowledge roles (6)
  Constraint = 'constraint',
  Decision = 'decision',
  Finding = 'finding',
  Pitfall = 'pitfall',
  Principle = 'principle',
  Requirement = 'requirement',

  // Issue roles (2)
  Error = 'error',
  Problem = 'problem',

  // Action roles (4)
  Command = 'command',
  Solution = 'solution',
  Task = 'task',
  Workflow = 'workflow',

  // Artifact roles (4)
  CodePattern = 'code_pattern',
  Concept = 'concept',
  Example = 'example',
  Technology = 'technology',

  // Source roles (4)
  WebUrl = 'web_url',
  FilePath = 'file_path',
  Repository = 'repository',
  ApiDoc = 'api_doc',
}

// Edge types (11 values)
export enum EdgeType {
  AlternativeTo = 'ALTERNATIVE_TO',
  AnchoredTo = 'ANCHORED_TO',
  BasedOn = 'BASED_ON',
  Causes = 'CAUSES',
  Contradicts = 'CONTRADICTS',
  DependsOn = 'DEPENDS_ON',
  ExampleOf = 'EXAMPLE_OF',
  PartOf = 'PART_OF',
  RelatedTo = 'RELATED_TO',
  Replaces = 'REPLACES',
  Resolves = 'RESOLVES',
}

// Type-role constraint matrix
export const VALID_ROLES_BY_TYPE: Record<NodeType, NodeRole[]> = {
  [NodeType.Knowledge]: [
    NodeRole.Constraint,
    NodeRole.Decision,
    NodeRole.Finding,
    NodeRole.Pitfall,
    NodeRole.Principle,
    NodeRole.Requirement,
  ],
  [NodeType.Issue]: [NodeRole.Error, NodeRole.Problem],
  [NodeType.Action]: [NodeRole.Command, NodeRole.Solution, NodeRole.Task, NodeRole.Workflow],
  [NodeType.Artifact]: [
    NodeRole.CodePattern,
    NodeRole.Concept,
    NodeRole.Example,
    NodeRole.Technology,
  ],
  [NodeType.Source]: [NodeRole.WebUrl, NodeRole.FilePath, NodeRole.Repository, NodeRole.ApiDoc],
};

// Validation function
export function isValidTypeRole(type: NodeType, role: NodeRole): boolean {
  const validRoles = VALID_ROLES_BY_TYPE[type];
  return validRoles ? validRoles.includes(role) : false;
}

export interface Node {
  id: string;
  type: NodeType;
  role: NodeRole;
  title: string;
  content: string;
  tags_json: string;
  importance: number;
  confidence: number;
  created_at: number;
  invalidated_at: number | null;
}

export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  type: EdgeType;
  created_at: number;
}

export interface InlineEdgeInput {
  source_id: string;
  target_id: string;
  type: EdgeType;
}

export interface NodeTag {
  node_id: string;
  tag: string;
}

export interface SearchResult extends Node {
  rank: number;
  match_quality: number;
  match_fields: string[];
  search_mode: SearchMode;
  relationships: {
    incoming: Edge[];
    outgoing: Edge[];
  };
}

export type SearchMode = 'auto' | 'keyword' | 'semantic' | 'hybrid';

export interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
  returned: number;
  limit: number;
  order: string;
  mode?: Exclude<SearchMode, 'auto'>;
}

export interface PaginatedResults<T> {
  results: T[];
  page: PageInfo;
}

export interface SearchOptions {
  query: string;
  type?: NodeType | NodeType[];
  role?: NodeRole;
  tags?: string[];
  tagMode?: 'all' | 'any';
  minImportance?: number;
  limit?: number;
  cursor?: string;
  mode?: SearchMode;
}

export interface TraverseOptions {
  startId: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  maxDepth?: number;
  edgeType?: EdgeType;
  limit?: number;
  cursor?: string;
}

export interface SearchGraphOptions
  extends
    Pick<
      SearchOptions,
      'query' | 'type' | 'tags' | 'tagMode' | 'minImportance' | 'limit' | 'role' | 'mode'
    >,
    Omit<TraverseOptions, 'startId'> {
  seedLimit?: number;
  minSeedRelevance?: number;
}
