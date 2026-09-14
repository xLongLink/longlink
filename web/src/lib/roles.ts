import { zOrganizationRoles } from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationRoles } from '@/lib/generated/platform-api-v1/types.gen';

/** Returns whether one role is at least as privileged as the required role. */
export function hasMinimumRole(role: OrganizationRoles | null | undefined, requiredRole: OrganizationRoles) {
    return role != null && zOrganizationRoles.options.indexOf(role) >= zOrganizationRoles.options.indexOf(requiredRole);
}
