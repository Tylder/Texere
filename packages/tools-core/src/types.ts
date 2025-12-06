// Core tool types - framework-agnostic definitions per spec §2
// See docs/specs/feature/texere-tool-spec.md for full specification
import { z } from 'zod';

export type FrameworkKind = 'mastra' | 'langgraph';

/**
 * Metadata that becomes the LLM-visible tool spec.
 * Per spec §2 ToolMeta interface.
 */
export interface ToolMeta<I, O> {
  /** Stable, unique identifier. */
  id: string;

  /** Natural-language description presented to the model. */
  description: string;

  /** Zod schema for input arguments (JSON-compatible). */
  inputSchema: z.ZodType<I>;

  /**
   * Optional Zod schema for outputs.
   * - Mastra: used for runtime validation and type inference.
   * - LangGraph: optional; can be used by tooling, but not required.
   */
  outputSchema?: z.ZodType<O>;

  /** Optional hinting for routing, UI grouping, or security classification. */
  tags?: string[];

  /** Human-friendly label for UIs (Studio, custom admin dashboards). */
  displayName?: string;

  /** Hierarchical grouping (e.g. "repo", "inventory", "auth"). */
  category?: string;

  /** Hints to orchestrators/schedulers. */
  isLongRunning?: boolean;
  isIdempotent?: boolean;
}

/**
 * Effect: request to update state (LangGraph primary target).
 * For Mastra, can be ignored or used for custom memory.
 * Per spec §2 StateUpdateEffect interface.
 */
export interface StateUpdateEffect<S = unknown> {
  kind: 'state-update';
  patch: Partial<S>;
}

/**
 * Effect: UI / progress event.
 * - Mastra: emitted via writer.custom() streaming.
 * - LangGraph: can be logged, sent via event bus, or folded into state.
 * Per spec §2 UiEventEffect interface.
 */
export interface UiEventEffect {
  kind: 'ui-event';
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Union of supported effect types.
 * Extendable later if needed (e.g. metrics, audit events).
 * Per spec §2 ToolEffect union.
 */
export type ToolEffect<S = unknown> = StateUpdateEffect<S> | UiEventEffect;

/**
 * Normalized tool result (success or failure) with optional effects.
 * Per spec §2 ToolSuccess and ToolFailure interfaces.
 */
export interface ToolSuccess<O, S = unknown> {
  ok: true;
  data: O;
  effects?: ToolEffect<S>[];
}

export interface ToolFailure<S = unknown> {
  ok: false;
  error: Error;
  effects?: ToolEffect<S>[];
}

export type ToolResult<O, S = unknown> = ToolSuccess<O, S> | ToolFailure<S>;

/**
 * Environment for Mastra-backed executions.
 * Mirrors Mastra's createTool execute(...) signature + streaming writer.
 * Per spec §2 MastraEnv interface.
 */
export interface MastraEnv {
  framework: 'mastra';

  /**
   * Mastra runtimeContext (shared DI, clients, db, etc.).
   * Typed by the application; kept as unknown here to keep tools generic.
   */
  runtimeContext?: unknown;

  /** Mastra tracingContext; can be used to create spans or attach attributes. */
  tracingContext?: unknown;

  /** Abort signal forwarded from Mastra's execution context. */
  abortSignal?: AbortSignal;

  /**
   * Streaming writer: maps to writer.custom({...}) in Mastra.
   * Used primarily for UiEventEffect.
   */
  writer?: {
    custom: (part: Record<string, unknown>) => Promise<void>;
  };
}

/**
 * Environment for LangGraph.js-backed executions.
 * Exposes graph state and a way to construct Commands.
 * Per spec §2 LangGraphEnv interface.
 */
export interface LangGraphEnv<State = unknown> {
  framework: 'langgraph';

  /**
   * Current graph state (mirrors InjectedState in LangGraph Python).
   * May be injected via a custom ToolNode or RunnableConfig.
   */
  state?: State;

  /**
   * Helper to construct a framework-native Command for updates/navigation.
   * For example: makeCommand({ stage: "IMPLEMENT" }).
   */
  makeCommand?: (patch: Partial<State>) => unknown;

  /**
   * Abort signal passed through RunnableConfig.signal.
   */
  signal?: AbortSignal;
}

/**
 * Unified environment union.
 * Handlers must pattern-match on env.framework to use framework-specific parts.
 * Per spec §2 ToolEnv union.
 */
export type ToolEnv<State = unknown> = MastraEnv | LangGraphEnv<State>;

/**
 * Core, framework-independent tool definition.
 * Per spec §2 CoreTool interface.
 */
export interface CoreTool<I, O, State = unknown> {
  meta: ToolMeta<I, O>;

  /**
   * Business logic implementation.
   * - Receives strongly-typed input and framework-specific env.
   * - Returns ToolResult plus optional effects.
   */
  handler: (input: I, env: ToolEnv<State>) => Promise<ToolResult<O, State>> | ToolResult<O, State>;
}
