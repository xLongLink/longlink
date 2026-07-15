export const ROLE_NAMES = ['read', 'write', 'maintain', 'admin', 'owner'] as const;

export type Role = (typeof ROLE_NAMES)[number];

export const APPLICATION_ROLE_NAMES = ['read', 'write', 'maintain', 'admin'] as const;

export type ApplicationRole = (typeof APPLICATION_ROLE_NAMES)[number];

export const PLATFORM_ROLE_NAMES = ['user', 'support', 'administrator'] as const;

export type PlatformRole = (typeof PLATFORM_ROLE_NAMES)[number];

export type RankedRole = Role | PlatformRole;

export const ROLE_RANKS = {
    read: 1,
    write: 2,
    maintain: 3,
    admin: 4,
    owner: 5,
    user: 1,
    support: 2,
    administrator: 3,
} as const satisfies Record<RankedRole, number>;

const ROLE_SCOPES = {
    read: 'tenant',
    write: 'tenant',
    maintain: 'tenant',
    admin: 'tenant',
    owner: 'tenant',
    user: 'platform',
    support: 'platform',
    administrator: 'platform',
} as const satisfies Record<RankedRole, 'platform' | 'tenant'>;

/** Returns whether one role is at least as privileged as the required role. */
export function hasMinimumRole(role: RankedRole | null | undefined, requiredRole: RankedRole) {
    return role !== null && role !== undefined && ROLE_SCOPES[role] === ROLE_SCOPES[requiredRole]
        ? ROLE_RANKS[role] >= ROLE_RANKS[requiredRole]
        : false;
}
