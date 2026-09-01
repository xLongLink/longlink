import { api } from '@/lib/api';
import { skipToken, type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    ApplicationCreate,
    OrganizationDetails,
    OrganizationInvitationCreate,
    OrganizationMemberUpdate,
    OrganizationUpdate,
} from '@/lib/generated/platform-api-v1/types.gen';
import {
    zGetOrganizationApplicationsApiV1OrganizationsOrganizationIdApplicationsGetResponse,
    zOrganizationDetails,
    zOrganizationSummary,
    zUserOrganizationMembership,
} from '@/lib/generated/platform-api-v1/zod.gen';

/** Returns current-user membership data for one organization route slug. */
function useOrganizationMembership(organizationSlug: string) {
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

    return { organizationId, role, isLoading: membershipQuery.isLoading, error: membershipQuery.error };
}

/** Invalidates cached organization application collections. */
function invalidateOrganizationApplicationQueries(queryClient: QueryClient, organizationId: string) {
    return Promise.all([
        queryClient.invalidateQueries({
            queryKey: ['api', `/api/v1/organizations/${organizationId}/applications`],
        }),
        queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/applications'] }),
    ]);
}

/** Fetches organization details and people-management data for the current workspace. */
export function useOrganization(organizationSlug: string) {
    const {
        organizationId,
        role,
        isLoading: isMembershipLoading,
        error: membershipError,
    } = useOrganizationMembership(organizationSlug);

    const organizationPath = organizationId ? `/api/v1/organizations/${organizationId}` : null;
    const organizationQuery = useQuery({
        queryKey: ['api', organizationPath],
        queryFn: organizationPath
            ? async ({ signal }) => zOrganizationDetails.parse(await api(organizationPath, { signal }).json())
            : skipToken,
        retry: false,
    });

    const error: (Error & { status?: number }) | null = organizationQuery.error ?? membershipError;
    const { organization, members = [], invitations = [] } = organizationQuery.data ?? {};

    return {
        organization,
        members,
        invitations,
        role,
        isLoading: isMembershipLoading || organizationQuery.isLoading,
        error,
    };
}

/** Fetches organization applications without loading people-management data. */
export function useOrganizationApplications(organizationSlug: string, enabled = true) {
    const {
        organizationId,
        role,
        isLoading: isMembershipLoading,
        error: membershipError,
    } = useOrganizationMembership(organizationSlug);
    const applicationsPath = enabled && organizationId ? `/api/v1/organizations/${organizationId}/applications` : null;
    const applicationsQuery = useQuery({
        queryKey: ['api', applicationsPath],
        queryFn: applicationsPath
            ? async ({ signal }) =>
                  zGetOrganizationApplicationsApiV1OrganizationsOrganizationIdApplicationsGetResponse.parse(
                      await api(applicationsPath, { signal }).json()
                  )
            : skipToken,
        refetchInterval: (query) =>
            query.state.data?.some((application) => application.status === 'creating') ? 5000 : false,
        retry: false,
    });
    const error: (Error & { status?: number }) | null = applicationsQuery.error ?? membershipError;

    return {
        applications: applicationsQuery.data ?? [],
        organizationId: organizationId ?? '',
        role,
        isLoading: isMembershipLoading || applicationsQuery.isLoading,
        error,
    };
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

/** Creates one application and refreshes organization application data. */
export function useCreateOrganizationApplication(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ApplicationCreate) =>
            api(`/api/v1/organizations/${organizationId}/applications`, { json: payload, method: 'POST' }),
        onSuccess: () => invalidateOrganizationApplicationQueries(queryClient, organizationId),
    });
}

/** Deletes one application and refreshes organization application data. */
export function useDeleteOrganizationApplication(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (applicationId: string) => api(`/api/v1/applications/${applicationId}`, { method: 'DELETE' }),
        onSuccess: () => invalidateOrganizationApplicationQueries(queryClient, organizationId),
    });
}

/** Updates mutable organization settings and refreshes organization caches. */
export function useUpdateOrganization(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ avatar }: OrganizationUpdate) => {
            return zOrganizationSummary.parse(
                await api(`/api/v1/organizations/${organizationId}`, {
                    json: { avatar },
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
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/applications'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
            ]);
        },
    });
}
