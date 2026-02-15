import { aboutTool } from './about.js';
import { createEdgeTool } from './create-edge.js';
import { deleteEdgeTool } from './delete-edge.js';
import { getNodeTool } from './get-node.js';
import { invalidateNodeTool } from './invalidate-node.js';
import { replaceNodeTool } from './replace-node.js';
import { searchTool } from './search.js';
import { statsTool } from './stats.js';
import { storeActionTool } from './store-action.js';
import { storeArtifactTool } from './store-artifact.js';
import { storeIssueTool } from './store-issue.js';
import { storeKnowledgeTool } from './store-knowledge.js';
import { storeSourceTool } from './store-source.js';
import { traverseTool } from './traverse.js';
import { validateTool } from './validate.js';

export { executeToolDefinition } from './helpers.js';
export type { ToolCallResult, ToolContext, ToolDefinition } from './types.js';

export const TOOL_DEFINITIONS = [
  storeKnowledgeTool,
  storeIssueTool,
  storeActionTool,
  storeArtifactTool,
  storeSourceTool,
  getNodeTool,
  invalidateNodeTool,
  replaceNodeTool,
  createEdgeTool,
  deleteEdgeTool,
  searchTool,
  traverseTool,
  aboutTool,
  statsTool,
  validateTool,
] as const;

export const TOOL_NAMES = TOOL_DEFINITIONS.map((tool) => tool.name) as ReadonlyArray<string>;
