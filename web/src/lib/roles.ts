import type { OrganizationRoles } from '@/lib/generated/platform-api-v1/types.gen';

export const ROLE_NAMES = ['read', 'write', 'maintain', 'admin', 'owner'] as const;

export type Role = OrganizationRoles;

const ROLE_RANKS = {
    read: 1,
    write: 2,
    maintain: 3,
    admin: 4,
    owner: 5,
} as const satisfies Record<Role, number>;

/** Returns whether one role is at least as privileged as the required role. */
export function hasMinimumRole(role: Role | null | undefined, requiredRole: Role) {
    return role != null && ROLE_RANKS[role] >= ROLE_RANKS[requiredRole];
}
