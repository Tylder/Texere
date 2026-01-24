import { describe, expect, it, vi } from 'vitest';

const promptMock = vi.hoisted(() => vi.fn(async () => ({ input: 'exit' })));

vi.mock('enquirer', () => ({
  prompt: promptMock,
}));

import { startRepl } from './repl.js';

describe('repl loop (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('exits when exit command is issued', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await startRepl();

    expect(promptMock).toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
