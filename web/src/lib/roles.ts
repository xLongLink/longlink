import type { OrganizationRoles } from '@/lib/generated/platform-api-v1/types.gen';
import { zOrganizationRoles } from '@/lib/generated/platform-api-v1/zod.gen';

export const ROLE_NAMES = zOrganizationRoles.options;

const ROLE_RANKS = {
    read: 1,
    write: 2,
    maintain: 3,
    admin: 4,
    owner: 5,
} as const satisfies Record<OrganizationRoles, number>;

/** Returns whether one role is at least as privileged as the required role. */
export function hasMinimumRole(role: OrganizationRoles | null | undefined, requiredRole: OrganizationRoles) {
    return role != null && ROLE_RANKS[role] >= ROLE_RANKS[requiredRole];
}
