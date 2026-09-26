import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ kill: vi.fn(), sessions: {} as Record<string, any> }));
vi.mock('./ops', () => ({ sessionKill: mocks.kill }));
vi.mock('./storage', () => ({ storage: { getState: () => ({ sessions: mocks.sessions }) } }));
import { releaseToDesktop } from './releaseToDesktop';

beforeEach(() => {
    vi.useFakeTimers();
    mocks.kill.mockReset().mockResolvedValue({ success: true });
    mocks.sessions = { a: { active: true, metadata: {} } };
});
afterEach(() => vi.useRealTimers());

describe('release to desktop', () => {
    it('waits for stopped lifecycle, not just the RPC acknowledgement or offline presence', async () => {
        let completed = false;
        const pending = releaseToDesktop('a').then(() => { completed = true; });
        await vi.advanceTimersByTimeAsync(500);
        expect(completed).toBe(false);
        mocks.sessions.a.active = false;
        await vi.advanceTimersByTimeAsync(500);
        expect(completed).toBe(false);
        mocks.sessions.a.metadata.lifecycleState = 'archived';
        await vi.advanceTimersByTimeAsync(250);
        expect(completed).toBe(false); // Legacy CLI archives before its child exits.
        mocks.sessions.a.metadata.archiveReason = 'Codex writer released';
        await vi.advanceTimersByTimeAsync(250);
        await pending;
        expect(completed).toBe(true);
        expect(mocks.kill).toHaveBeenCalledWith('a');
    });
    it('reports RPC failure without pretending a server archive released the writer', async () => {
        mocks.kill.mockResolvedValue({ success: false, message: 'Machine offline' });
        await expect(releaseToDesktop('a')).rejects.toThrow('Machine offline');
        expect(mocks.sessions.a.active).toBe(true);
    });
    it('times out if the runner never confirms shutdown, including missing session data', async () => {
        delete mocks.sessions.a;
        const pending = expect(releaseToDesktop('a')).rejects.toThrow('Timed out');
        await vi.advanceTimersByTimeAsync(15000);
        await pending;
    });
});
