import type { z } from 'zod';
import { createContext, useContext } from 'react';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

// The organization layout owns membership loading for its nested pages.
export const OrganizationMembershipContext = createContext<z.output<typeof zUserOrganizationMembership> | undefined>(
    undefined
);

/** Reads the membership already resolved by the organization layout. */
export function useResolvedOrganizationMembership() {
    const membership = useContext(OrganizationMembershipContext);

    // Catch callers mounted outside the membership-owning layout.
    if (membership === undefined) {
        throw new Error('useResolvedOrganizationMembership must be used within an organization route');
    }
    return membership;
}
