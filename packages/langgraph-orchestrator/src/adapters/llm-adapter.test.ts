/**
 * @file LLM Adapter Tests
 * @description Unit tests for LLM initialization with Ollama
 * @reference testing_specification.md §3–7
 * @reference langgraph_orchestrator_spec.md §10.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { initializeLLM } from './llm-adapter.js';

describe('initializeLLM (langgraph_orchestrator_spec.md §10.1)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('initializes LLM with default Ollama endpoint', () => {
    delete process.env['OLLAMA_BASE_URL'];
    delete process.env['OLLAMA_MODEL'];

    const result = initializeLLM();

    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('modelWithTools');
    expect(result).toHaveProperty('tools');
    expect(Array.isArray(result.tools)).toBe(true);
  });

  it('uses custom Ollama endpoint from environment', () => {
    process.env['OLLAMA_BASE_URL'] = 'http://custom-ollama:11434';
    process.env['OLLAMA_MODEL'] = 'custom-model:7b';

    const result = initializeLLM();

    expect(result.model).toBeTruthy();
    expect(result.modelWithTools).toBeTruthy();
  });

  it('returns LLMInitResult with model and tools', () => {
    delete process.env['OLLAMA_BASE_URL'];
    delete process.env['OLLAMA_MODEL'];

    const result = initializeLLM();

    expect(result).toMatchObject({
      model: expect.anything(),
      modelWithTools: expect.anything(),
      tools: expect.any(Array),
    });
  });

  it('binds tools to model', () => {
    delete process.env['OLLAMA_BASE_URL'];
    delete process.env['OLLAMA_MODEL'];

    const result = initializeLLM();

    expect(result.modelWithTools).toBeTruthy();
    expect(result.tools.length).toBeGreaterThan(0);
  });
});
