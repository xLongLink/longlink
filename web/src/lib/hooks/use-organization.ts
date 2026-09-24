import { api } from '@/lib/api';
import { skipToken, useQuery } from '@tanstack/react-query';
import {
    zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse,
    zUserOrganizationMembership,
} from '@/lib/generated/platform-api-v1/zod.gen';

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

/** Fetches membership and solutions for one organization route. */
export function useOrganizationRoute(organizationSlug: string) {
    const membershipQuery = useOrganizationMembership(organizationSlug);
    const membership = membershipQuery.data;
    const organizationId = membership?.organization.id;

    const solutionsKey = ['api', organizationId ? `/api/v1/organizations/${organizationId}/solutions` : null] as const;
    const solutionsPath = solutionsKey[1];
    const solutionsQuery = useQuery({
        queryKey: solutionsKey,
        queryFn: solutionsPath
            ? async ({ signal }) =>
                  zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse.parse(
                      await api(solutionsPath, { signal }).json()
                  )
            : skipToken,
        refetchInterval: (query) =>
            query.state.data?.some((solution) => solution.status === 'creating' || solution.deployment_pending)
                ? 5000
                : false,
        meta: { polling: true },
        retry: false,
    });
    const error: (Error & { status?: number }) | null = solutionsQuery.error ?? membershipQuery.error;

    return {
        solutions: solutionsQuery.data ?? [],
        isLoading: membershipQuery.isLoading || solutionsQuery.isLoading,
        error,
    };
}
