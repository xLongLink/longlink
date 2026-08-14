import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@/lib/roles';
import type {
    ApplicationCreate,
    OrganizationApplicationSummary,
    OrganizationCreate,
    OrganizationDetails,
    OrganizationInvitationCreate,
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
    OrganizationMemberUpdate,
    OrganizationSummary,
    OrganizationUpdate,
} from '@/lib/generated/platform-api-v1/types.gen';
import { useApiQuery } from '@/hooks/use-api';
import { useUserProfile } from '@/hooks/use-user';
import { platformApiPath } from '@/lib/platform-api';
import { ApiError, apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import { applicationsQueryKey, organizationsQueryKey, userOrganizationsQueryKey } from '@/lib/query-keys';
import {
    zApplicationResponse,
    zOrganizationDetails,
    zOrganizationSummary,
} from '@/lib/generated/platform-api-v1/zod.gen';

type UseOrganizationResult = {
    organization: OrganizationSummary | undefined;
    members: OrganizationMemberAccessResponse[];
    invitations: OrganizationInvitationResponse[];
    applications: OrganizationApplicationSummary[];
    role: Role | null;
    isLoading: boolean;
    error: (Error & { status?: number }) | null;
};

/** Fetches organization details and related collections for the current workspace. */
export function useOrganization(organizationSlug: string): UseOrganizationResult {
    const { memberships, isOrganizationsLoading: isUserLoading } = useUserProfile();
    const membership = memberships.find((item) => item.organization.slug === organizationSlug);
    const organizationId = membership?.organization.id ?? '';
    const missingOrganization = !isUserLoading && organizationSlug.length > 0 && organizationId.length === 0;

    const organizationQuery = useApiQuery<OrganizationDetails>(
        organizationId.length > 0 ? platformApiPath(`/organizations/${organizationId}`) : null,
        {
            parse: (value) => zOrganizationDetails.parse(value),
            refetchInterval: 5000,
            retry: false,
        }
    );

    const error = organizationQuery.error ?? (missingOrganization ? new ApiError('Organization not found', 404) : null);
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

/** Invites one organization member and refreshes organization data. */
export function useInviteOrganizationMember(organizationId: string) {
    const queryClient = useQueryClient();
    const organizationPath = platformApiPath(`/organizations/${organizationId}`);

    return useMutation({
        mutationFn: async ({ email, role }: OrganizationInvitationCreate) => {
            // Require a resolved organization before mutating.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            return fetchApiVoid(platformApiPath(`/organizations/${organizationId}/invitations`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });
}

/** Creates one application and refreshes organization application data. */
export function useCreateOrganizationApplication(organizationId: string) {
    const queryClient = useQueryClient();
    const organizationPath = platformApiPath(`/organizations/${organizationId}`);

    return useMutation({
        mutationFn: async ({
            name,
            image,
            description,
            icon,
            envs,
        }: ApplicationCreate & { envs: Record<string, string> }) => {
            // Require a resolved organization before creating apps.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            return fetchApiJson(
                platformApiPath(`/organizations/${organizationId}/applications`),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, image, description, icon, envs }),
                },
                (value) => zApplicationResponse.parse(value)
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
            await queryClient.invalidateQueries({ queryKey: applicationsQueryKey });
        },
    });
}

/** Changes one organization member role and refreshes membership data. */
export function useChangeOrganizationMemberRole(organizationId: string) {
    const queryClient = useQueryClient();
    const organizationPath = platformApiPath(`/organizations/${organizationId}`);

    return useMutation({
        mutationFn: async ({ memberId, role }: OrganizationMemberUpdate & { memberId: string }) => {
            // Require a resolved organization before mutating.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            return fetchApiVoid(platformApiPath(`/organizations/${organizationId}/members/${memberId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey });
            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });
}

/** Deletes one application and refreshes organization application data. */
export function useDeleteOrganizationApplication(organizationId: string) {
    const queryClient = useQueryClient();
    const organizationPath = organizationId.length > 0 ? platformApiPath(`/organizations/${organizationId}`) : null;

    return useMutation({
        mutationFn: async (applicationId: string) => {
            // Require a resolved organization before deleting apps.
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

            await fetchApiJson(
                platformApiPath(`/applications/${applicationId}`),
                {
                    method: 'DELETE',
                },
                (value) => zApplicationResponse.parse(value)
            );

            await queryClient.refetchQueries({ queryKey: apiQueryKey(organizationPath), type: 'active' });
            await queryClient.invalidateQueries({ queryKey: applicationsQueryKey });
        },
    });
}

/** Creates a new organization and refreshes the authenticated user cache. */
export function useCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ name }: OrganizationCreate) =>
            fetchApiJson(
                platformApiPath('/organizations'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                },
                (value) => zOrganizationSummary.parse(value)
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey });
        },
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

            return fetchApiJson(
                organizationPath,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar }),
                },
                (value) => zOrganizationSummary.parse(value)
            );
        },
        onSuccess: async () => {
            // Refresh every response that embeds Organization metadata.
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) }),
                queryClient.invalidateQueries({ queryKey: applicationsQueryKey }),
                queryClient.invalidateQueries({ queryKey: organizationsQueryKey }),
                queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey }),
            ]);
        },
    });
}

/** Deletes one organization and refreshes the authenticated user cache. */
export function useDeleteOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (organizationId: string) => {
            // Require an organization identifier before deleting.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await fetchApiVoid(platformApiPath(`/organizations/${organizationId}`), {
                method: 'DELETE',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey });
        },
    });
}
