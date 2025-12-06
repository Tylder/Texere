/**
 * Tests for tool adapter.
 * Spec reference: langgraph_orchestrator_spec.md §6.2, §9; testing_specification.md §3, §7
 */
import { describe, expect, it } from 'vitest';

import { buildToolRegistry, getToolByName } from './tool-adapter';

describe('buildToolRegistry (langgraph_orchestrator_spec.md §9.2)', () => {
  it('should return an array of tools', () => {
    const tools = buildToolRegistry();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should include list_files tool', () => {
    const tools = buildToolRegistry();
    const listFilesTool = tools.find((t) => t.name === 'list_files');
    expect(listFilesTool).toBeDefined();
    expect(listFilesTool?.description).toContain('List files');
  });
});

describe('getToolByName (langgraph_orchestrator_spec.md §6.3)', () => {
  it('should return list_files tool by name', () => {
    const tool = getToolByName('list_files');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('list_files');
  });

  it('should return undefined for non-existent tool', () => {
    const tool = getToolByName('nonexistent');
    expect(tool).toBeUndefined();
  });
});
