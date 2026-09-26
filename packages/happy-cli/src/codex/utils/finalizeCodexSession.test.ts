import { describe, expect, it, vi } from 'vitest';
import { finalizeCodexSession } from './finalizeCodexSession';

describe('Codex release lifecycle', () => {
    it('waits for the writer exit, then disconnects without archive or lost identity', async () => {
        let exited!: () => void;
        let metadata: any = { path: '/repo', codexThreadId: 'native-thread', lifecycleState: 'running' };
        const session = { updateMetadata: vi.fn(update => { metadata = update(metadata); }), sendSessionDeath: vi.fn(), flush: vi.fn(async () => {}), close: vi.fn(async () => {}) };
        const pending = finalizeCodexSession({ disconnectAndWait: () => new Promise(resolve => { exited = resolve; }) }, session, 'request');
        expect(session.updateMetadata).not.toHaveBeenCalled();
        exited();
        await pending;
        expect(metadata).toMatchObject({ path: '/repo', codexThreadId: 'native-thread', lifecycleState: 'disconnected', desktopReleaseRequestId: 'request' });
        expect(metadata.archivedBy).toBeUndefined();
        expect(metadata.archiveReason).toBeUndefined();
        expect(session.close).toHaveBeenCalledOnce();
    });
    it('leaves explicit archive behavior intact', async () => {
        let metadata: any = { path: '/repo' };
        const session = { updateMetadata: (update: any) => { metadata = update(metadata); }, sendSessionDeath: vi.fn(), flush: vi.fn(async () => {}), close: vi.fn(async () => {}) };
        await finalizeCodexSession({ disconnectAndWait: async () => {} }, session);
        expect(metadata.lifecycleState).toBe('archived');
        expect(metadata.desktopReleaseRequestId).toBeUndefined();
    });
    it('does not report success when writer shutdown fails', async () => {
        const session = { updateMetadata: vi.fn(), sendSessionDeath: vi.fn(), flush: vi.fn(async () => {}), close: vi.fn(async () => {}) };
        await expect(finalizeCodexSession({ disconnectAndWait: async () => { throw new Error('still alive'); } }, session, 'request')).rejects.toThrow('still alive');
        expect(session.updateMetadata).not.toHaveBeenCalled();
        expect(session.sendSessionDeath).not.toHaveBeenCalled();
    });
});
