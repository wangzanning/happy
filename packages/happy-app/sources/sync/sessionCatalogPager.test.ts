import { describe, expect, it, vi } from 'vitest';
import { SessionCatalogPager } from './sessionCatalogPager';

describe('session catalog pagination', () => {
    it('fetches one page at a time, coalesces scroll events and preserves its cursor on refresh', async () => {
        const fetch = vi.fn(async (cursor?: string) => ({ nextCursor: cursor ? 'page3' : 'page2', hasNext: true }));
        const pager = new SessionCatalogPager(fetch);
        await pager.refresh();
        expect(fetch).toHaveBeenCalledTimes(1);
        await Promise.all(Array.from({ length: 20 }, () => pager.loadMore()));
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenLastCalledWith('page2');
        await pager.refresh();
        expect(fetch).toHaveBeenLastCalledWith(undefined);
        fetch.mockResolvedValueOnce({ nextCursor: null as any, hasNext: false });
        await pager.loadMore();
        expect(fetch).toHaveBeenLastCalledWith('page3');
        expect(pager.getSnapshot().hasMore).toBe(false);
        await pager.loadMore();
        expect(fetch).toHaveBeenCalledTimes(4);
    });
    it('keeps the failed cursor available for retry', async () => {
        const fetch = vi.fn().mockResolvedValueOnce({ nextCursor: 'next', hasNext: true })
            .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ nextCursor: null, hasNext: false });
        const pager = new SessionCatalogPager(fetch);
        await pager.refresh();
        await expect(pager.loadMore()).rejects.toThrow('offline');
        expect(pager.getSnapshot()).toEqual({ loading: false, error: true, hasMore: true });
        await pager.loadMore();
        expect(fetch.mock.calls.map(call => call[0])).toEqual([undefined, 'next', 'next']);
    });
    it('does not apply old account pagination state after reset', async () => {
        let finish!: (page: any) => void;
        const pager = new SessionCatalogPager(() => new Promise(resolve => { finish = resolve; }));
        const pending = pager.refresh();
        await Promise.resolve();
        pager.reset();
        finish({ nextCursor: null, hasNext: false });
        await pending;
        expect(pager.getSnapshot()).toEqual({ loading: false, error: false, hasMore: true });
    });
    it('rejects a nonadvancing cursor instead of endlessly loading duplicates', async () => {
        const pager = new SessionCatalogPager(async () => ({ nextCursor: 'same', hasNext: true }));
        await pager.refresh();
        await expect(pager.loadMore()).rejects.toThrow('did not advance');
    });
});
