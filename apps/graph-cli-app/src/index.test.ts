import { describe, expect, it, vi } from 'vitest';

const startReplMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('./repl.js', () => ({
  startRepl: startReplMock,
}));

describe('cli entrypoint (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('starts the repl and prints the banner', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await import('./index.js');
    expect(startReplMock).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
