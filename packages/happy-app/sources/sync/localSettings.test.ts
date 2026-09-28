import { describe, expect, it } from 'vitest';
import { applyLocalSettings, localSettingsParse } from './localSettings';

describe('device-local project layout', () => {
    it('upgrades existing device settings to project mode without losing expanded projects', () => {
        const settings = localSettingsParse({ expandedProjects: { repo: true }, themePreference: 'dark' });
        expect(settings.sessionListGrouping).toBe('project');
        expect(settings.expandedProjects).toEqual({ repo: true });
        expect(settings.themePreference).toBe('dark');
    });
    it('persists an explicit local layout choice across restarts', () => {
        const settings = applyLocalSettings(localSettingsParse({}), { sessionListGrouping: 'flat' });
        expect(localSettingsParse(JSON.parse(JSON.stringify(settings))).sessionListGrouping).toBe('flat');
    });
});
