import { useApi } from '@/lib/hooks/use-api';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

/** Fetches membership for one organization route. */
export function useOrganizationMembership(organizationSlug: string) {
    // Share membership cache identity across the layout and its dependent pages.
    const membershipPath =
        organizationSlug === '' ? null : `/api/v1/organizations/slug/${encodeURIComponent(organizationSlug)}`;
    return useApi(membershipPath, zUserOrganizationMembership);
}
