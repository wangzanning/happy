import type { Metadata } from '@/api/types';

type Session = {
    updateMetadata: (update: (current: Metadata) => Metadata) => void;
    sendSessionDeath: () => void;
    flush: () => Promise<void>;
    close: () => Promise<void>;
};

/** A release marker is only published after the native writer has exited. */
export async function finalizeCodexSession(client: { disconnectAndWait: () => Promise<void> }, session: Session | null, releaseRequestId?: string) {
    await client.disconnectAndWait();
    if (!session) return;
    session.updateMetadata(current => ({
        ...current,
        lifecycleState: releaseRequestId ? 'disconnected' : 'archived',
        lifecycleStateSince: Date.now(),
        archivedBy: releaseRequestId ? undefined : 'cli',
        archiveReason: releaseRequestId ? undefined : 'Codex writer released',
        desktopReleaseRequestId: releaseRequestId,
    }));
    session.sendSessionDeath();
    await session.flush();
    await session.close();
}
