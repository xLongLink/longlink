import { api } from '@/lib/api';
import type { SolutionCreate } from '@/lib/generated/platform-api-v1/types.gen';
import { skipToken, type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse,
    zUserOrganizationMembership,
} from '@/lib/generated/platform-api-v1/zod.gen';

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
    const solutionsPath = organizationId ? `/api/v1/organizations/${organizationId}/solutions` : null;
    const solutionsQuery = useQuery({
        queryKey: ['api', solutionsPath],
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

    return {
        organizationId,
        role,
        solutions: solutionsQuery.data ?? [],
        isMembershipLoading: membershipQuery.isLoading,
        isSolutionsLoading: solutionsQuery.isLoading,
        membershipError: membershipQuery.error,
        solutionsError: solutionsQuery.error,
    };
}

/** Invalidates cached organization solution collections. */
export function invalidateOrganizationSolutionQueries(queryClient: QueryClient, organizationId: string) {
    return Promise.all([
        queryClient.invalidateQueries({
            queryKey: ['api', `/api/v1/organizations/${organizationId}/solutions`],
        }),
        queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/solutions'] }),
    ]);
}

/** Creates one solution and refreshes organization solution data. */
export function useCreateOrganizationSolution(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: SolutionCreate) =>
            api(`/api/v1/organizations/${organizationId}/solutions`, { json: payload, method: 'POST' }),
        onSuccess: () => invalidateOrganizationSolutionQueries(queryClient, organizationId),
    });
}
