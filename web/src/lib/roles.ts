export const ROLE_NAMES = ['read', 'write', 'maintain', 'admin', 'owner'] as const;

export type Role = (typeof ROLE_NAMES)[number];

export const PLATFORM_ROLE_NAMES = ['user', 'administrator'] as const;

const ROLE_RANKS = {
    read: 1,
    write: 2,
    maintain: 3,
    admin: 4,
    owner: 5,
} as const satisfies Record<Role, number>;

/** Returns whether one role is at least as privileged as the required role. */
export function hasMinimumRole(role: Role | null | undefined, requiredRole: Role) {
    // Missing membership roles cannot satisfy role requirements.
    if (role === null || role === undefined) {
        return false;
    }

    return ROLE_RANKS[role] >= ROLE_RANKS[requiredRole];
}
