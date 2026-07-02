export const ROLE_NAMES = ['read', 'write', 'maintain', 'admin', 'owner'] as const;

export type Role = (typeof ROLE_NAMES)[number];

export const APPLICATION_ROLE_NAMES = ['read', 'write', 'maintain', 'admin'] as const;

export type ApplicationRole = (typeof APPLICATION_ROLE_NAMES)[number];

export const PLATFORM_ROLE_NAMES = ['user', 'support', 'administrator'] as const;

export type PlatformRole = (typeof PLATFORM_ROLE_NAMES)[number];

const ELEVATED_ORGANIZATION_ROLES = new Set<Role>(['maintain', 'admin', 'owner']);
const APPLICATION_LOG_ROLES = new Set<ApplicationRole>(['maintain', 'admin']);
const APPLICATION_MANAGEMENT_ROLES = new Set<ApplicationRole>(['maintain', 'admin']);

/** Returns whether a user can open an application runtime. */
export function canAccessApplication(organizationRole: Role | null | undefined, applicationRole: ApplicationRole | null) {
    return applicationRole !== null || (organizationRole ? ELEVATED_ORGANIZATION_ROLES.has(organizationRole) : false);
}

/** Returns whether a user can view application logs. */
export function canViewApplicationLogs(organizationRole: Role | null | undefined, applicationRole: ApplicationRole | null) {
    return (
        (applicationRole ? APPLICATION_LOG_ROLES.has(applicationRole) : false) ||
        (organizationRole ? ELEVATED_ORGANIZATION_ROLES.has(organizationRole) : false)
    );
}

/** Returns whether a user can manage application lifecycle actions. */
export function canManageApplication(organizationRole: Role | null | undefined, applicationRole: ApplicationRole | null) {
    return (
        (applicationRole ? APPLICATION_MANAGEMENT_ROLES.has(applicationRole) : false) ||
        (organizationRole ? ELEVATED_ORGANIZATION_ROLES.has(organizationRole) : false)
    );
}
