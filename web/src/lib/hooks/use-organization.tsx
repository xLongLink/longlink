import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    ApplicationCreate,
    OrganizationDetails,
    OrganizationInvitationCreate,
    OrganizationMemberUpdate,
    OrganizationUpdate,
} from '@/lib/generated/platform-api-v1/types.gen';
import { useApiQuery } from '@/lib/hooks/use-api';
import { platformApiPath } from '@/lib/platform-api';
import { useUserProfile } from '@/lib/hooks/use-user';
import { ApiError, fetchApiJson, requestApi, requestApiJson } from '@/lib/api';
import { zOrganizationDetails, zOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import {
    applicationsQueryKey,
    organizationQueryKey,
    organizationsQueryKey,
    userOrganizationsQueryKey,
} from '@/lib/query-keys';

/** Fetches organization details and related collections for the current workspace. */
export function useOrganization(organizationSlug: string) {
    const { memberships, isOrganizationsLoading: isUserLoading } = useUserProfile();
    const membership = memberships.find((item) => item.organization.slug === organizationSlug);
    const organizationId = membership?.organization.id ?? '';

    const organizationQuery = useApiQuery<OrganizationDetails>(
        organizationId.length > 0 ? platformApiPath(`/organizations/${organizationId}`) : null,
        {
            parse: (value) => zOrganizationDetails.parse(value),
            refetchInterval: 5000,
            retry: false,
        }
    );

    const error: (Error & { status?: number }) | null =
        organizationQuery.error ??
        (!isUserLoading && organizationSlug.length > 0 && organizationId.length === 0
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

            await requestApiJson(platformApiPath(`/organizations/${organizationId}/invitations`), payload, {
                method: 'POST',
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
    });

    const changeMemberRole = useMutation({
        mutationFn: async ({ memberId, role }: OrganizationMemberUpdate & { memberId: string }) => {
            // Require a resolved organization before mutating.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await requestApiJson(
                platformApiPath(`/organizations/${organizationId}/members/${memberId}`),
                { role },
                {
                    method: 'PATCH',
                }
            );
        },
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey }),
                queryClient.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
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

            await requestApiJson(platformApiPath(`/organizations/${organizationId}/applications`), payload, {
                method: 'POST',
            });
        },
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
                queryClient.invalidateQueries({ queryKey: applicationsQueryKey }),
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

            await requestApi(platformApiPath(`/applications/${applicationId}`), { method: 'DELETE' });
        },
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
                queryClient.invalidateQueries({ queryKey: applicationsQueryKey }),
            ]),
    });
}

/** Updates mutable organization settings and refreshes organization caches. */
export function useUpdateOrganization(organizationId: string) {
    const queryClient = useQueryClient();
    const organizationPath = platformApiPath(`/organizations/${organizationId}`);

    return useMutation({
        mutationFn: async ({ avatar }: OrganizationUpdate) => {
            // Require a resolved organization before updating its settings.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            return zOrganizationSummary.parse(
                await fetchApiJson(organizationPath, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar }),
                })
            );
        },
        // Refresh every response that embeds Organization metadata.
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: organizationQueryKey(organizationId) }),
                queryClient.invalidateQueries({ queryKey: applicationsQueryKey }),
                queryClient.invalidateQueries({ queryKey: organizationsQueryKey }),
                queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey }),
            ]),
    });
}
