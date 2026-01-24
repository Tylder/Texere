import { describe, it, expect } from 'vitest';

import { createDeterministicId } from './index.js';

describe('createDeterministicId', () => {
  it('produces consistent hashes for the same input', () => {
    const input = 'test-input';
    const hash1 = createDeterministicId(input);
    const hash2 = createDeterministicId(input);

    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = createDeterministicId('input-1');
    const hash2 = createDeterministicId('input-2');

    expect(hash1).not.toBe(hash2);
  });

  it('produces 64-character hex strings', () => {
    const hash = createDeterministicId('test');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles empty strings', () => {
    const hash = createDeterministicId('');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles long strings', () => {
    const longInput = 'a'.repeat(10000);
    const hash = createDeterministicId(longInput);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
