export type CatalogPage = { nextCursor: string | null; hasNext: boolean };
export type CatalogState = { loading: boolean; hasMore: boolean; error: boolean };

/** One bounded request per scroll; refreshes never rewind a consumed cursor. */
export class SessionCatalogPager {
    private cursor: string | null = null;
    private initialized = false;
    private generation = 0;
    private pending: Promise<void> | null = null;
    private listeners = new Set<() => void>();
    private state: CatalogState = { loading: false, hasMore: true, error: false };
    constructor(private fetchPage: (cursor?: string) => Promise<CatalogPage>) {}
    get initializedOnce() { return this.initialized; }
    getSnapshot = () => this.state;
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    private update(state: CatalogState) { this.state = state; this.listeners.forEach(fn => fn()); }
    reset() {
        this.generation++;
        this.cursor = null;
        this.initialized = false;
        this.pending = null;
        this.update({ loading: false, hasMore: true, error: false });
    }
    refresh = (): Promise<void> => this.run(true);
    loadMore = (): Promise<void> => this.run(false);
    private run(refresh: boolean): Promise<void> {
        if (this.pending) return this.pending.then(() => refresh ? this.run(true) : undefined);
        if (!refresh && !this.state.hasMore) return Promise.resolve();
        const generation = this.generation;
        const cursor = refresh ? undefined : this.cursor ?? undefined;
        this.update({ ...this.state, loading: true, error: false });
        this.pending = this.fetchPage(cursor).then(page => {
            if (generation !== this.generation) return;
            if (page.hasNext && (!page.nextCursor || page.nextCursor === cursor)) throw new Error('Session cursor did not advance');
            if (!refresh || !this.initialized) {
                this.cursor = page.nextCursor;
                this.initialized = true;
                this.update({ loading: true, hasMore: page.hasNext, error: false });
            }
        }).catch(error => {
            if (generation === this.generation) this.update({ ...this.state, error: true });
            throw error;
        }).finally(() => {
            if (generation === this.generation) {
                this.pending = null;
                this.update({ ...this.state, loading: false });
            }
        });
        return this.pending;
    }
}
