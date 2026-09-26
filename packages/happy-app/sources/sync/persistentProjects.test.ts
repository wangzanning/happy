import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { buildPathProjectGroups } from './projectGroups';

// Exercise the production list builder without importing native persistence
// and notification services that are initialized by the full store module.
const source = readFileSync(new URL('./storage.ts', import.meta.url), 'utf8');
const begin = source.indexOf('function buildSessionListViewData(');
const end = source.indexOf('\nexport const storage', begin);
const dependencies = {
    isSessionArchived: (s: any) => s.metadata?.lifecycleState === 'archived',
    isRigMetadata: () => false,
    isProjectSession: () => false,
    isSessionActive: (s: any) => s.active,
    getSessionActivityAt: (s: any) => s.updatedAt,
    buildSessionRowData: (s: any) => ({ ...s, archived: s.metadata?.lifecycleState === 'archived' }),
    buildProjectGroups: () => [],
    buildPathProjectGroups,
    relativeDayTitle: () => 'Today',
};
const build = new Function(...Object.keys(dependencies), ts.transpile(source.slice(begin, end)) + '\nreturn buildSessionListViewData;')(...Object.values(dependencies));

describe('persistent project membership', () => {
    it('retains the same project when its last session stops and is archived', () => {
        const session = { id: 'a', active: true, updatedAt: 1, metadata: { path: '/repo', machineId: 'mac' } };
        const before = build({ a: session }, new Set(), {}, new Set(), {}, true);
        const after = build({ a: { ...session, active: false, metadata: { ...session.metadata, lifecycleState: 'archived' } } }, new Set(), {}, new Set(), {}, true);
        const project = (items: any[]) => items.find(i => i.type === 'project').project;
        expect(project(after).id).toBe(project(before).id);
        expect(project(after).workspaces[0].sessions[0]).toMatchObject({ id: 'a', archived: true });
        expect(after.some((i: any) => i.type === 'session')).toBe(false);
    });
    it('preserves the flat archive convention outside project history mode', () => {
        const session = { id: 'a', active: false, updatedAt: 1, metadata: { path: '/repo', lifecycleState: 'archived' } };
        expect(build({ a: session }, new Set(), {}, new Set()).map((i: any) => i.type)).toEqual(['header', 'session']);
    });
});
