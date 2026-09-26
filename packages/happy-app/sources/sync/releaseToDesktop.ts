import { sessionKill } from './ops';
import { storage } from './storage';

/** Never substitute a server-only archive: it cannot release a native writer. */
export async function releaseToDesktop(sessionId: string): Promise<void> {
    const result = await sessionKill(sessionId);
    if (!result.success) throw new Error(result.message || 'Failed to request session shutdown');
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        const session = storage.getState().sessions[sessionId];
        // Missing data, stale offline presence, or a kill acknowledgement are
        // insufficient: require the runner's archived lifecycle and inactivity.
        if (session && !session.active && session.metadata?.lifecycleState === 'archived'
            && session.metadata?.archiveReason === 'Codex writer released') return;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('Timed out waiting for the Mac to confirm session shutdown');
}
