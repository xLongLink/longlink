import type { z } from 'zod';
import { useApiQuery } from '@/lib/hooks/use-api';
import { createContext, useContext } from 'react';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

// The organization layout owns membership loading for its nested pages.
export const OrganizationMembershipContext = createContext<z.output<typeof zUserOrganizationMembership> | undefined>(
    undefined
);

/** Fetches membership for one organization route. */
export function useOrganizationMembership(organizationSlug: string) {
    // Share membership cache identity across the layout and its dependent pages.
    const membershipPath =
        organizationSlug === '' ? null : `/api/v1/organizations/slug/${encodeURIComponent(organizationSlug)}`;
    return useApiQuery(membershipPath, zUserOrganizationMembership);
}

/** Reads the membership already resolved by the organization layout. */
export function useResolvedOrganizationMembership() {
    const membership = useContext(OrganizationMembershipContext);

    // Catch callers mounted outside the membership-owning layout.
    if (membership === undefined) {
        throw new Error('useResolvedOrganizationMembership must be used within an organization route');
    }
    return membership;
}
