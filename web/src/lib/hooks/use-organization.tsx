import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    ApplicationCreate,
    OrganizationInvitationCreate,
    OrganizationMemberUpdate,
    OrganizationUpdate,
} from '@/lib/generated/platform-api-v1/types.gen';
import { api, ApiError } from '@/lib/api';
import { useUserProfile } from '@/lib/hooks/use-user';
import { zOrganizationDetails, zOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Returns a resolved organization identifier for mutation requests. */
function requireOrganizationId(organizationId: string): string {
    if (!organizationId) {
        throw new Error('Organization not found');
    }

    return organizationId;
}

/** Fetches organization details and related collections for the current workspace. */
export function useOrganization(organizationSlug: string) {
    const { memberships, isOrganizationsLoading: isUserLoading } = useUserProfile();
    const membership = memberships.find((item) => item.organization.slug === organizationSlug);
    const organizationId = membership?.organization.id;

    const organizationPath = organizationId ? `/api/v1/organizations/${organizationId}` : null;
    const organizationQuery = useQuery({
        queryKey: ['api', organizationPath],
        queryFn:
            organizationPath === null
                ? skipToken
                : async ({ signal }) => zOrganizationDetails.parse(await api(organizationPath, { signal }).json()),
        refetchInterval: 5000,
        retry: false,
    });

    const error: (Error & { status?: number }) | null =
        organizationQuery.error ??
        (!isUserLoading && organizationSlug.length > 0 && !organizationId
            ? new ApiError('Organization not found', 404)
            : null);
    const { organization, members = [], invitations = [], applications = [] } = organizationQuery.data ?? {};

    return {
        organization,
        members,
        invitations,
        applications,
        role: membership?.role ?? null,
        isLoading: isUserLoading || organizationQuery.isLoading,
        error,
    };
}

/** Provides mutations for organization members and invitations. */
export function useOrganizationMembers(organizationId: string) {
    const queryClient = useQueryClient();

    const inviteMember = useMutation({
        mutationFn: async (payload: OrganizationInvitationCreate) => {
            // Require a resolved organization before mutating.
            const id = requireOrganizationId(organizationId);

            await api(`/api/v1/organizations/${id}/invitations`, {
                json: payload,
                method: 'POST',
            });
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
    });

    const changeMemberRole = useMutation({
        mutationFn: async ({ memberId, role }: OrganizationMemberUpdate & { memberId: string }) => {
            // Require a resolved organization before mutating.
            const id = requireOrganizationId(organizationId);

            await api(`/api/v1/organizations/${id}/members/${memberId}`, {
                json: { role },
                method: 'PATCH',
            });
        },
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
            ]),
    });

    return { inviteMember, changeMemberRole };
}

/** Creates one application and refreshes organization application data. */
export function useCreateOrganizationApplication(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ApplicationCreate) => {
            // Require a resolved organization before creating apps.
            const id = requireOrganizationId(organizationId);

            await api(`/api/v1/organizations/${id}/applications`, {
                json: payload,
                method: 'POST',
            });
        },
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/applications'] }),
            ]),
    });
}

/** Deletes one application and refreshes organization application data. */
export function useDeleteOrganizationApplication(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (applicationId: string) => {
            // Require a resolved organization before deleting apps.
            requireOrganizationId(organizationId);

            await api(`/api/v1/applications/${applicationId}`, { method: 'DELETE' });
        },
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/applications'] }),
            ]),
    });
}

/** Updates mutable organization settings and refreshes organization caches. */
export function useUpdateOrganization(organizationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ avatar }: OrganizationUpdate) => {
            // Require a resolved organization before updating its settings.
            const id = requireOrganizationId(organizationId);

            const response = await api(`/api/v1/organizations/${id}`, {
                json: { avatar },
                method: 'PATCH',
            });

            return zOrganizationSummary.parse(await response.json());
        },
        // Refresh every response that embeds Organization metadata.
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/applications'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
            ]),
    });
}
