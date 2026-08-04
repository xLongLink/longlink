import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/use-api';
import { useUserOrganizations } from '@/hooks/use-user';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import {
    zApplicationResponse,
    zOrganizationDetails,
    zOrganizationSummary,
} from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { applicationsQueryKey, organizationsQueryKey, userOrganizationsQueryKey } from '@/lib/query-keys';
import type { Role } from '@/lib/roles';
import type {
    ApiInvitation,
    ApiOrganizationApplication,
    ApiOrganizationDetails,
    ApiOrganizationMember,
    ApiOrganizationSummary,
} from '@/lib/types';

type UseOrganizationResult = {
    organization: ApiOrganizationSummary | undefined;
    members: ApiOrganizationMember[];
    invitations: ApiInvitation[];
    applications: ApiOrganizationApplication[];
    role: Role | null;
    isLoading: boolean;
    error: (Error & { status?: number }) | null;
};

/** Fetches organization details and related collections for the current workspace. */
export function useOrganization(organizationSlug: string): UseOrganizationResult {
    const { memberships, isLoading: isUserLoading } = useUserOrganizations();
    const membership = memberships.find((item) => item.organization.slug === organizationSlug);
    const organizationId = membership?.organization.id ?? '';
    const organizationPath = organizationId.length > 0 ? platformApiPath(`/organizations/${organizationId}`) : null;

    const missingOrganization = !isUserLoading && organizationSlug.length > 0 && organizationId.length === 0;

    const organizationQuery = useApiQuery<ApiOrganizationDetails>(organizationPath, {
        parse: (value) => zOrganizationDetails.parse(value),
        refetchInterval: 5000,
        retry: false,
    });

    const error =
        organizationQuery.error ??
        (missingOrganization
            ? (Object.assign(new Error('Organization not found'), { status: 404 }) as Error & { status?: number })
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

/** Invites one organization member and refreshes organization data. */
export function useInviteOrganizationMember(organizationId: string, canInviteMembers: boolean) {
    const queryClient = useQueryClient();
    const organizationPath = platformApiPath(`/organizations/${organizationId}`);

    return useMutation({
        mutationFn: async ({ email, role }: { email: string; role: Role }) => {
            // Require a resolved organization before mutating.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            // Enforce invitation permissions locally.
            if (!canInviteMembers) {
                throw new Error('Invitation permissions required');
            }

            return fetchApiVoid(platformApiPath(`/organizations/${organizationId}/invitations`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
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
        }: {
            name: string;
            image: string;
            description?: string | null;
            icon?: string | null;
            envs: Record<string, string>;
        }) => {
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
export function useChangeOrganizationMemberRole(organizationId: string, canManageMembers: boolean) {
    const queryClient = useQueryClient();
    const organizationPath = platformApiPath(`/organizations/${organizationId}`);

    return useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: Role }) => {
            // Require a resolved organization before mutating.
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            // Enforce member management permissions locally.
            if (!canManageMembers) {
                throw new Error('Member management permissions required');
            }

            return fetchApiVoid(platformApiPath(`/organizations/${organizationId}/members/${memberId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey });
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
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
        mutationFn: ({ name }: { name: string }) =>
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
export function useUpdateOrganization(organizationId: string, canManageOrganization: boolean) {
    const queryClient = useQueryClient();
    const organizationPath = platformApiPath(`/organizations/${organizationId}`);

    return useMutation({
        mutationFn: async ({ avatar }: { avatar: string }) => {
            // Require a resolved organization and local management permission.
            if (!organizationId) {
                throw new Error('Organization not found');
            }
            if (!canManageOrganization) {
                throw new Error('Organization management permissions required');
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

            await fetchApiJson(
                platformApiPath(`/organizations/${organizationId}`),
                {
                    method: 'DELETE',
                },
                (value) => zOrganizationSummary.parse(value)
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey });
        },
    });
}
