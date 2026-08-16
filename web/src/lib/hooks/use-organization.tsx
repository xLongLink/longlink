import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    ApplicationCreate,
    OrganizationInvitationCreate,
    OrganizationMemberUpdate,
    OrganizationUpdate,
} from '@/lib/generated/platform-api-v1/types.gen';
import { useUserProfile } from '@/lib/hooks/use-user';
import { ApiError, fetchApiJson, requestApi, requestApiJson } from '@/lib/api';
import { zOrganizationDetails, zOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';

const disabledApiQueryKey = ['api', 'disabled'] as const;

/** Fetches organization details and related collections for the current workspace. */
export function useOrganization(organizationSlug: string) {
    const { memberships, isOrganizationsLoading: isUserLoading } = useUserProfile();
    const membership = memberships.find((item) => item.organization.slug === organizationSlug);
    const organizationId = membership?.organization.id;

    const organizationPath = organizationId ? `/api/v1/organizations/${organizationId}` : null;
    const organizationQuery = useQuery({
        enabled: organizationPath !== null,
        queryKey: organizationPath ? ['api', organizationPath] : disabledApiQueryKey,
        queryFn: async ({ signal }) => {
            if (organizationPath === null) {
                throw new Error('Organization path is unavailable');
            }

            return zOrganizationDetails.parse(await fetchApiJson(organizationPath, { signal }));
        },
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
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await requestApiJson(`/api/v1/organizations/${organizationId}/invitations`, payload, {
                method: 'POST',
            });
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['api', `/api/v1/organizations/${organizationId}`] }),
    });

    const changeMemberRole = useMutation({
        mutationFn: async ({ memberId, role }: OrganizationMemberUpdate & { memberId: string }) => {
            // Require a resolved organization before mutating.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await requestApiJson(
                `/api/v1/organizations/${organizationId}/members/${memberId}`,
                { role },
                {
                    method: 'PATCH',
                }
            );
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
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await requestApiJson(`/api/v1/organizations/${organizationId}/applications`, payload, {
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
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await requestApi(`/api/v1/applications/${applicationId}`, { method: 'DELETE' });
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
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            const response = await requestApiJson(
                `/api/v1/organizations/${organizationId}`,
                { avatar },
                { method: 'PATCH' }
            );

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
