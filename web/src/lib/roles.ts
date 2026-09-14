import type { z } from 'zod';
import { zOrganizationRoles } from '@/lib/generated/platform-api-v1/zod.gen';

/** Returns whether one role is at least as privileged as the required role. */
export function hasMinimumRole(
    role: z.output<typeof zOrganizationRoles> | null | undefined,
    requiredRole: z.output<typeof zOrganizationRoles>
) {
    return role != null && zOrganizationRoles.options.indexOf(role) >= zOrganizationRoles.options.indexOf(requiredRole);
}
