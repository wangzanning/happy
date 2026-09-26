import type { ChildProcess } from 'node:child_process';

/** Register before signalling the child; a successful signal is not proof of exit. */
export function waitForProcessExit(child: ChildProcess, timeoutMs = 5000): Promise<void> {
    if (child.exitCode != null || child.signalCode != null) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            clearTimeout(timer);
            child.removeListener('exit', onExit);
        };
        const onExit = () => { cleanup(); resolve(); };
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Codex process has not exited; desktop handoff is not confirmed'));
        }, timeoutMs);
        child.once('exit', onExit);
    });
}
