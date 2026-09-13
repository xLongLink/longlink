import { api } from '@/lib/api';
import { skipToken, type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    SolutionCreate,
    OrganizationDetails,
    OrganizationInvitationCreate,
    OrganizationMemberUpdate,
    OrganizationUpdate,
} from '@/lib/generated/platform-api-v1/types.gen';
import {
    zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse,
    zOrganizationDetails,
    zOrganizationSummary,
    zUserOrganizationMembership,
} from '@/lib/generated/platform-api-v1/zod.gen';

/** Fetches membership and solutions for one organization route. */
export function useOrganizationRoute(organizationSlug: string, solutionsEnabled = true) {
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
    const organization = membership?.organization;
    const organizationId = organization?.id;
    const role = membership?.role ?? null;
    const solutionsPath =
        solutionsEnabled && organizationId ? `/api/v1/organizations/${organizationId}/solutions` : null;
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
        organization,
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
function invalidateOrganizationSolutionQueries(queryClient: QueryClient, organizationId: string) {
    return Promise.all([
        queryClient.invalidateQueries({
            queryKey: ['api', `/api/v1/organizations/${organizationId}/solutions`],
        }),
        queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/solutions'] }),
    ]);
}

/** Fetches organization details and people-management data for the current workspace. */
export function useOrganization(organizationId: string | undefined) {
    const organizationPath = organizationId ? `/api/v1/organizations/${organizationId}` : null;
    const organizationQuery = useQuery({
        queryKey: ['api', organizationPath],
        queryFn: organizationPath
            ? async ({ signal }) => zOrganizationDetails.parse(await api(organizationPath, { signal }).json())
            : skipToken,
        retry: false,
    });

    const { organization, members = [], invitations = [] } = organizationQuery.data ?? {};

    return {
        organization,
        members,
        invitations,
        isLoading: organizationQuery.isLoading,
        error: organizationQuery.error,
    };
}

/** Deletes one organization and refreshes organization access data. */
export function useDeleteOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (organizationId: string) => api(`/api/v1/organizations/${organizationId}`, { method: 'DELETE' }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations/slug'] }),
            ]);
        },
    });
}

/** Provides mutations for organization members and invitations. */
export function useOrganizationMembers(organizationId: string) {
    const queryClient = useQueryClient();

    const inviteMember = useMutation({
        mutationFn: (payload: OrganizationInvitationCreate) =>
            api(`/api/v1/organizations/${organizationId}/invitations`, { json: payload, method: 'POST' }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
    });

    const revokeInvitation = useMutation({
        mutationFn: (invitationId: string) =>
            api(`/api/v1/organizations/${organizationId}/invitations/${invitationId}`, { method: 'DELETE' }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
    });

    const changeMemberRole = useMutation({
        mutationFn: ({ memberId, role }: OrganizationMemberUpdate & { memberId: string }) =>
            api(`/api/v1/organizations/${organizationId}/members/${memberId}`, { json: { role }, method: 'PATCH' }),
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations/slug'] }),
                queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
            ]),
    });

    return { inviteMember, revokeInvitation, changeMemberRole };
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

/** Deletes one solution and refreshes organization solution data. */
export function useDeleteOrganizationSolution(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (solutionId: string) => api(`/api/v1/solutions/${solutionId}`, { method: 'DELETE' }),
        onSuccess: () => invalidateOrganizationSolutionQueries(queryClient, organizationId),
    });
}

/** Updates mutable organization settings and refreshes organization caches. */
export function useUpdateOrganization(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: OrganizationUpdate) => {
            return zOrganizationSummary.parse(
                await api(`/api/v1/organizations/${organizationId}`, {
                    json: payload,
                    method: 'PATCH',
                }).json()
            );
        },
        onSuccess: (updatedOrganization) => {
            // Publish the saved Organization before background refreshes run.
            queryClient.setQueryData<OrganizationDetails>(
                ['api', `/api/v1/organizations/${organizationId}`],
                (current) => (current ? { ...current, organization: updatedOrganization } : current)
            );

            // Refresh every response that embeds Organization metadata.
            return Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/solutions'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
            ]);
        },
    });
}
