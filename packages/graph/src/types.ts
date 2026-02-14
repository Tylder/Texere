// Core node types (6 values)
export enum NodeType {
  Knowledge = 'knowledge',
  Issue = 'issue',
  Action = 'action',
  Artifact = 'artifact',
  Context = 'context',
  Meta = 'meta',
}

// Node roles (23 values) - constrained by type
export enum NodeRole {
  // Knowledge roles (7)
  Constraint = 'constraint',
  Decision = 'decision',
  Finding = 'finding',
  Pitfall = 'pitfall',
  Principle = 'principle',
  Requirement = 'requirement',
  Research = 'research',

  // Issue roles (2)
  Error = 'error',
  Problem = 'problem',

  // Action roles (5)
  Command = 'command',
  Fix = 'fix',
  Solution = 'solution',
  Task = 'task',
  Workflow = 'workflow',

  // Artifact roles (7)
  CodePattern = 'code_pattern',
  Concept = 'concept',
  Example = 'example',
  FileContext = 'file_context',
  Project = 'project',
  Source = 'source',
  Technology = 'technology',

  // Context roles (1)
  Conversation = 'conversation',

  // Meta roles (1)
  System = 'system',
}

export enum NodeStatus {
  Proposed = 'proposed',
  Active = 'active',
  Deprecated = 'deprecated',
  Invalidated = 'invalidated',
}

export enum NodeScope {
  Project = 'project',
  Module = 'module',
  File = 'file',
  Session = 'session',
}

// Edge types (16 values)
export enum EdgeType {
  About = 'ABOUT',
  AlternativeTo = 'ALTERNATIVE_TO',
  AnchoredTo = 'ANCHORED_TO',
  BasedOn = 'BASED_ON',
  Causes = 'CAUSES',
  Constrains = 'CONSTRAINS',
  Contradicts = 'CONTRADICTS',
  DependsOn = 'DEPENDS_ON',
  ExampleOf = 'EXAMPLE_OF',
  Extends = 'EXTENDS',
  IsA = 'IS_A',
  PartOf = 'PART_OF',
  RelatedTo = 'RELATED_TO',
  Replaces = 'REPLACES',
  Resolves = 'RESOLVES',
  Supports = 'SUPPORTS',
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
    NodeRole.Research,
  ],
  [NodeType.Issue]: [NodeRole.Error, NodeRole.Problem],
  [NodeType.Action]: [
    NodeRole.Command,
    NodeRole.Fix,
    NodeRole.Solution,
    NodeRole.Task,
    NodeRole.Workflow,
  ],
  [NodeType.Artifact]: [
    NodeRole.CodePattern,
    NodeRole.Concept,
    NodeRole.Example,
    NodeRole.FileContext,
    NodeRole.Project,
    NodeRole.Source,
    NodeRole.Technology,
  ],
  [NodeType.Context]: [NodeRole.Conversation],
  [NodeType.Meta]: [NodeRole.System],
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
  status?: NodeStatus;
  scope?: NodeScope;
  created_at: number;
  invalidated_at: number | null;
}

export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  type: EdgeType;
  strength: number;
  confidence: number;
  created_at: number;
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

export interface SearchOptions {
  query: string;
  type?: NodeType | NodeType[];
  role?: NodeRole;
  tags?: string[];
  tagMode?: 'all' | 'any';
  minImportance?: number;
  limit?: number;
  mode?: SearchMode;
}

export interface TraverseOptions {
  startId: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  maxDepth?: number;
  edgeType?: EdgeType;
}

export interface AboutOptions
  extends
    Pick<
      SearchOptions,
      'query' | 'type' | 'tags' | 'tagMode' | 'minImportance' | 'limit' | 'role' | 'mode'
    >,
    Omit<TraverseOptions, 'startId'> {}
