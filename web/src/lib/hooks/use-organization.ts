import { api } from '@/lib/api';
import { skipToken, useQuery } from '@tanstack/react-query';
import {
    zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse,
    zUserOrganizationMembership,
} from '@/lib/generated/platform-api-v1/zod.gen';

/** Builds the cached solutions collection key for one organization. */
export function organizationSolutionsKey(organizationId: string | undefined) {
    return ['api', organizationId ? `/api/v1/organizations/${organizationId}/solutions` : null] as const;
}

/** Fetches membership and solutions for one organization route. */
export function useOrganizationRoute(organizationSlug: string) {
    const membershipPath = `/api/v1/organizations/slug/${organizationSlug}`;
    const membershipQuery = useQuery({
        queryKey: ['api', '/api/v1/organizations/slug', organizationSlug],
        queryFn:
            organizationSlug === ''
                ? skipToken
                : async ({ signal }) => zUserOrganizationMembership.parse(await api(membershipPath, { signal }).json()),
        retry: false,
    });
    const membership = membershipQuery.data;
    const organizationId = membership?.organization.id;
    const role = membership?.role ?? null;

    // Resolve the collection cache key once so fetching and invalidation share one path template.
    const solutionsKey = organizationSolutionsKey(organizationId);
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
        organizationId,
        role,
        solutions: solutionsQuery.data ?? [],
        isLoading: membershipQuery.isLoading || solutionsQuery.isLoading,
        error,
    };
}
