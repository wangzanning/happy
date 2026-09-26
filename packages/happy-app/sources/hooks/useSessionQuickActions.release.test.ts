import * as React from 'react';
// @ts-expect-error react-test-renderer has no declarations in this workspace.
import { act, create } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ alert: vi.fn(), release: vi.fn(async () => {}), cleanup: vi.fn() }));
vi.hoisted(() => { vi.stubGlobal('__DEV__', false); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
vi.mock('@/sync/releaseToDesktop', () => ({ releaseToDesktop: mocks.release }));
vi.mock('@/modal', () => ({ Modal: { alert: mocks.alert } }));
vi.mock('@/hooks/useNavigateToSession', () => ({ useNavigateToSession: () => vi.fn() }));
vi.mock('@/hooks/useWorktreeCleanup', () => ({ maybeCleanupWorktree: mocks.cleanup }));
vi.mock('@/sync/ops', () => ({}));
vi.mock('@/sync/storage', () => ({ storage: {}, useLocalSetting: () => false, useSetting: () => false, useMachine: () => null, useSession: () => null }));
vi.mock('@/sync/sync', () => ({ sync: {} }));
vi.mock('@/sync/messageMeta', () => ({}));
vi.mock('@/text', () => ({ t: (key: string) => key }));
vi.mock('@/utils/copySessionMetadataToClipboard', () => ({}));
vi.mock('@/utils/sessionUtils', () => ({ useSessionStatus: () => ({ isConnected: false }) }));
vi.mock('@/utils/machineUtils', () => ({ isMachineOnline: () => false }));
vi.mock('@/utils/sessionFork', () => ({ getSessionForkSource: () => null }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/DuplicateSheet', () => ({ DuplicateSheet: () => null }));
vi.mock('@/sync/rig', () => ({ isRigMetadata: () => false }));
import { useSessionQuickActions } from './useSessionQuickActions';
let renderer: ReturnType<typeof create>;
afterEach(() => { if (renderer) act(() => renderer.unmount()); vi.clearAllMocks(); });
function mount(session: any) {
    let result!: ReturnType<typeof useSessionQuickActions>;
    function Host() { result = useSessionQuickActions(session); return null; }
    act(() => { renderer = create(React.createElement(Host)); });
    return () => result;
}
describe('desktop release action', () => {
    it('exposes a confirmed action without worktree cleanup or deleting history', async () => {
        const get = mount({ id: 'codex', active: true, metadata: { flavor: 'codex' } });
        act(() => get().actionItems.find(item => item.id === 'release-desktop')!.onPress());
        expect(mocks.release).not.toHaveBeenCalled();
        const buttons = mocks.alert.mock.calls[0][2];
        expect(buttons[0].style).toBe('cancel');
        await act(async () => buttons[1].onPress());
        expect(mocks.release).toHaveBeenCalledWith('codex');
        expect(mocks.cleanup).not.toHaveBeenCalled();
        expect(mocks.alert).toHaveBeenLastCalledWith('common.success', 'sessionInfo.releaseDesktopDone');
    });
    it.each([
        { active: false, metadata: { flavor: 'codex' } },
        { active: true, metadata: { flavor: 'claude' } },
        { active: true, metadata: { flavor: 'codex', bot: true } },
    ])('does not offer release for an ineligible session: %o', session => {
        expect(mount({ id: 'a', ...session })().canReleaseToDesktop).toBe(false);
    });
});
