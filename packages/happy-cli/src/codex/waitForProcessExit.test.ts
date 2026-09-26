import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForProcessExit } from './waitForProcessExit';
afterEach(() => vi.useRealTimers());

describe('confirmed Codex process exit', () => {
    it('does not treat a signal request as completion', async () => {
        const child = new EventEmitter() as ChildProcess;
        let exited = false;
        const pending = waitForProcessExit(child).then(() => { exited = true; });
        await Promise.resolve();
        expect(exited).toBe(false);
        child.emit('exit', 0, null);
        await pending;
        expect(exited).toBe(true);
        expect(child.listenerCount('exit')).toBe(0);
    });
    it('rejects an unconfirmed shutdown and removes its listener', async () => {
        vi.useFakeTimers();
        const child = new EventEmitter() as ChildProcess;
        const pending = expect(waitForProcessExit(child, 100)).rejects.toThrow('not confirmed');
        await vi.advanceTimersByTimeAsync(100);
        await pending;
        expect(child.listenerCount('exit')).toBe(0);
    });
    it('waits for a real child process to release its lifetime', async () => {
        const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
        try {
            const pending = waitForProcessExit(child);
            child.kill('SIGTERM');
            await pending;
            expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
            await waitForProcessExit(child);
        } finally { child.kill('SIGKILL'); }
    });
});
