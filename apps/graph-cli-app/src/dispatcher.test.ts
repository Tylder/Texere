import { describe, expect, it } from 'vitest';

import { InMemoryGraphStore } from '@repo/graph-store';

import { GraphCLI } from './cli.js';
import { CommandDispatcher } from './dispatcher.js';

describe('CommandDispatcher parsing (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('routes two-word commands and parses flags', async () => {
    const cli = new GraphCLI(new InMemoryGraphStore());
    const dispatcher = new CommandDispatcher();
    let captured: string[] = [];
    let capturedFlags: Record<string, string | boolean> = {};

    dispatcher.register('ingest repo', {
      description: 'Ingest',
      usage: 'ingest repo <source>',
      handler: async (args, flags) => {
        captured = args;
        capturedFlags = flags;
        return { success: true, message: 'ok' };
      },
    });

    const result = await dispatcher.execute('ingest repo ./demo --commit abc', cli);

    expect(result.success).toBe(true);
    expect(captured).toEqual(['./demo']);
    expect(capturedFlags).toEqual({ commit: 'abc' });
  });

  it('returns a helpful error for unknown commands', async () => {
    const cli = new GraphCLI(new InMemoryGraphStore());
    const dispatcher = new CommandDispatcher();

    const result = await dispatcher.execute('unknown', cli);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown command');
  });
});
