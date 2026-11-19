import type { z } from 'zod';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export const assignableRoleSchema = schemas.zOrganizationRoles.exclude(['owner']);

export type AssignableRole = z.output<typeof assignableRoleSchema>;

/** Identifies organization roles allowed to administer membership and Solution permissions. */
export function canAdminister(role: z.output<typeof schemas.zOrganizationRoles>): boolean {
    return role === 'admin' || role === 'owner';
}

/** Identifies organization roles allowed to maintain Solutions, registries, and invitations. */
export function canMaintain(role: z.output<typeof schemas.zOrganizationRoles>): boolean {
    return role === 'maintain' || canAdminister(role);
}
