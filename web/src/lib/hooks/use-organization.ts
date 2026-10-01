import { api } from '@/lib/api';
import { skipToken, useQuery } from '@tanstack/react-query';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

/** Fetches membership for one organization route. */
export function useOrganizationMembership(organizationSlug: string) {
    const membershipPath = `/api/v1/organizations/slug/${organizationSlug}`;
    return useQuery({
        queryKey: ['api', '/api/v1/organizations/slug', organizationSlug],
        queryFn:
            organizationSlug === ''
                ? skipToken
                : async ({ signal }) => zUserOrganizationMembership.parse(await api(membershipPath, { signal }).json()),
        retry: false,
    });
}
