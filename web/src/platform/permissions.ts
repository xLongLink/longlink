import type { z } from 'zod';
import type { zOrganizationRoles } from '@/lib/generated/platform-api-v1/zod.gen';

/** Identifies organization roles allowed to administer membership and Solution permissions. */
export function canAdminister(role: z.output<typeof zOrganizationRoles>): boolean {
    return role === 'admin' || role === 'owner';
}

/** Identifies organization roles allowed to maintain Solutions, registries, and invitations. */
export function canMaintain(role: z.output<typeof zOrganizationRoles>): boolean {
    return role === 'maintain' || canAdminister(role);
}
