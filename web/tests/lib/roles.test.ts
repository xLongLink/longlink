import {
    canAccessApplication,
    canManageOrganizationMembers,
    canViewApplicationLogs,
    hasMinimumRole,
    roleRank,
} from '@/lib/roles';
import { describe, expect, it } from 'bun:test';

describe('role rank helpers', () => {
    it('assigns numeric ranks to tenant and platform roles', () => {
        expect(roleRank('read')).toBe(1);
        expect(roleRank('write')).toBe(2);
        expect(roleRank('maintain')).toBe(3);
        expect(roleRank('admin')).toBe(4);
        expect(roleRank('owner')).toBe(5);
        expect(roleRank('user')).toBe(1);
        expect(roleRank('support')).toBe(2);
        expect(roleRank('administrator')).toBe(3);
    });

    it('compares only roles from the same scope', () => {
        expect(hasMinimumRole('admin', 'maintain')).toBe(true);
        expect(hasMinimumRole('write', 'maintain')).toBe(false);
        expect(hasMinimumRole('administrator', 'support')).toBe(true);
        expect(hasMinimumRole('administrator', 'read')).toBe(false);
    });
});

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

describe('organization role helpers', () => {
    it('allows admins and owners to manage organization members', () => {
        expect(canManageOrganizationMembers('admin')).toBe(true);
        expect(canManageOrganizationMembers('owner')).toBe(true);
        expect(canManageOrganizationMembers('maintain')).toBe(false);
    });
});
