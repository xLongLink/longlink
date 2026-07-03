import { canAccessApplication, canViewApplicationLogs } from '@/lib/roles';
import { describe, expect, it } from 'bun:test';

describe('application role helpers', () => {
    it('allows app members and elevated organization members to open app runtimes', () => {
        expect(canAccessApplication('read', 'read')).toBe(true);
        expect(canAccessApplication('maintain', null)).toBe(true);
        expect(canAccessApplication('read', null)).toBe(false);
    });

    it('allows maintainers and elevated organization members to view application logs', () => {
        expect(canViewApplicationLogs('read', 'maintain')).toBe(true);
        expect(canViewApplicationLogs('owner', null)).toBe(true);
        expect(canViewApplicationLogs('read', 'read')).toBe(false);
    });
});
