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

/** Returns the numeric rank for one role within its role scope. */
export function roleRank(role: RankedRole | null | undefined) {
    return role ? ROLE_RANKS[role] : 0;
}

/** Returns whether one role is at least as privileged as the required role. */
export function hasMinimumRole(role: RankedRole | null | undefined, requiredRole: RankedRole) {
    return role !== null && role !== undefined && ROLE_SCOPES[role] === ROLE_SCOPES[requiredRole]
        ? roleRank(role) >= roleRank(requiredRole)
        : false;
}

/** Returns whether an organization role grants elevated application-level access. */
export function canUseOrganizationApplicationAccess(organizationRole: Role | null | undefined) {
    return hasMinimumRole(organizationRole, 'maintain');
}

/** Returns whether a user can create applications in an organization. */
export function canCreateApplication(organizationRole: Role | null | undefined) {
    return canUseOrganizationApplicationAccess(organizationRole);
}

/** Returns whether a user can invite organization members. */
export function canCreateOrganizationInvitation(organizationRole: Role | null | undefined) {
    return hasMinimumRole(organizationRole, 'maintain');
}

/** Returns whether a user can inspect organization infrastructure resources. */
export function canInspectOrganizationResources(organizationRole: Role | null | undefined) {
    return hasMinimumRole(organizationRole, 'maintain');
}

/** Returns whether a user can manage organization members. */
export function canManageOrganizationMembers(organizationRole: Role | null | undefined) {
    return hasMinimumRole(organizationRole, 'admin');
}

/** Returns whether a user can manage organization owner assignments. */
export function canManageOrganizationOwnerRole(organizationRole: Role | null | undefined) {
    return hasMinimumRole(organizationRole, 'owner');
}

/** Returns whether a user can open an application runtime. */
export function canAccessApplication(
    organizationRole: Role | null | undefined,
    applicationRole: ApplicationRole | null
) {
    return applicationRole !== null || canUseOrganizationApplicationAccess(organizationRole);
}

/** Returns whether a user can view application logs. */
export function canViewApplicationLogs(
    organizationRole: Role | null | undefined,
    applicationRole: ApplicationRole | null
) {
    return hasMinimumRole(applicationRole, 'maintain') || canUseOrganizationApplicationAccess(organizationRole);
}

/** Returns whether a user can manage application lifecycle actions. */
export function canManageApplication(
    organizationRole: Role | null | undefined,
    applicationRole: ApplicationRole | null
) {
    return hasMinimumRole(applicationRole, 'maintain') || canUseOrganizationApplicationAccess(organizationRole);
}
