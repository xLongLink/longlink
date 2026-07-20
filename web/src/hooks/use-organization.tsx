import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    ApiApplicationResponse,
    ApiInvitation,
    ApiOrganizationApplication,
    ApiOrganizationDetails,
    ApiOrganizationMemberSummary,
    ApiUserOrganizationMembership,
} from '@/lib/types';
import { useApiQuery } from '@/hooks/use-api';
import { useUserProfile } from '@/hooks/use-user';
import { hasMinimumRole, type Role } from '@/lib/roles';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import { applicationsQueryKey, organizationsQueryKey, userOrganizationsQueryKey } from '@/lib/query-keys';
import {
    apiApplicationMutationResponseSchema,
    apiOrganizationDetailsSchema,
    apiOrganizationMutationResponseSchema,
    parseApiResponse,
} from '@/lib/api-schemas';

type UseOrganizationResult = {
    organization: ApiOrganizationDetails | undefined;
    people: ApiOrganizationMemberSummary[];
    invitations: ApiInvitation[];
    applications: ApiOrganizationApplication[];
    isLoading: boolean;
    error: (Error & { status?: number }) | null;
};

type UseOrganizationActionsResult = {
    inviteMember: (payload: { email: string; role: Role }) => Promise<void>;
    isInviting: boolean;
    canInviteMembers: boolean;
    changeMemberRole: (payload: { memberId: string; role: Role }) => Promise<void>;
    isChangingMemberRole: boolean;
    canManageMembers: boolean;
    createApplication: (payload: {
        name: string;
        image: string;
        description?: string | null;
        icon?: string | null;
        envs: Record<string, string>;
    }) => Promise<ApiApplicationResponse>;
    isCreatingApplication: boolean;
    deleteApplication: (applicationId: string) => Promise<void>;
    isDeletingApplication: boolean;
};

/** Resolves one route organization slug to its canonical UUID. */
export function resolveOrganizationId(
    organizationSlug: string,
    organizations: ApiUserOrganizationMembership[]
): string {
    const organization = organizations.find((item) => item.slug === organizationSlug);
    return organization?.id ?? '';
}

/** Fetches organization details and related collections for the current workspace. */
export function useOrganization(organizationSlug: string): UseOrganizationResult {
    const { organizations, isLoading: isUserLoading } = useUserProfile();
    const organizationId = resolveOrganizationId(organizationSlug, organizations);
    const organizationPath = organizationId.length > 0 ? `/api/organizations/${organizationId}` : null;

    const missingOrganization = !isUserLoading && organizationSlug.length > 0 && organizationId.length === 0;

    const organizationQuery = useApiQuery<ApiOrganizationDetails>(organizationPath, {
        parse: (value) => parseApiResponse(apiOrganizationDetailsSchema, value),
        refetchInterval: 5000,
        retry: false,
    });

    const error =
        organizationQuery.error ??
        (missingOrganization
            ? (Object.assign(new Error('Organization not found'), { status: 404 }) as Error & { status?: number })
            : null);

    return {
        organization: organizationQuery.data,
        people: organizationQuery.data?.users ?? [],
        invitations: organizationQuery.data?.invitations ?? [],
        applications: organizationQuery.data?.applications ?? [],
        isLoading: isUserLoading || organizationQuery.isLoading,
        error,
    };
}

/** Returns organization-scoped mutation helpers. */
export function useOrganizationActions(organizationSlug: string): UseOrganizationActionsResult {
    const queryClient = useQueryClient();
    const { organizations } = useUserProfile();
    const organizationId = resolveOrganizationId(organizationSlug, organizations);
    const organizationPath = organizationId.length > 0 ? `/api/organizations/${organizationId}` : null;
    const organizationMembership = organizations.find((item) => item.slug === organizationSlug);
    const canInviteMembers = hasMinimumRole(organizationMembership?.role, 'maintain');
    const canManageMembers = hasMinimumRole(organizationMembership?.role, 'admin');

    const inviteMemberMutation = useMutation({
        mutationFn: async ({ email, role }: { email: string; role: Role }) => {
            // Require a resolved organization before mutating.
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

            // Enforce invitation permissions locally.
            if (!canInviteMembers) {
                throw new Error('Invitation permissions required');
            }

            return fetchApiVoid(`/api/organizations/${organizationId}/invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role }),
            });
        },
        onSuccess: async () => {
            // Skip cache work when the organization is unresolved.
            if (organizationPath === null) {
                return;
            }

            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey() });
            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });

    const createApplicationMutation = useMutation({
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
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

            return fetchApiJson(
                `/api/organizations/${organizationId}/applications`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, image, description, icon, envs }),
                },
                (value) => parseApiResponse(apiApplicationMutationResponseSchema, value).application
            );
        },
        onSuccess: async () => {
            // Skip cache work when the organization is unresolved.
            if (organizationPath === null) {
                return;
            }

            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
            await queryClient.invalidateQueries({ queryKey: applicationsQueryKey() });
        },
    });

    const changeMemberRoleMutation = useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: Role }) => {
            // Require a resolved organization before mutating.
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

            // Enforce member management permissions locally.
            if (!canManageMembers) {
                throw new Error('Member management permissions required');
            }

            return fetchApiVoid(`/api/organizations/${organizationId}/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
        },
        onSuccess: async () => {
            // Skip cache work when the organization is unresolved.
            if (organizationPath === null) {
                return;
            }

            await queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey() });
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey() });
            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });

    const deleteApplicationMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            // Require a resolved organization before deleting apps.
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

            await fetchApiJson(
                `/api/applications/${applicationId}`,
                {
                    method: 'DELETE',
                },
                (value) => parseApiResponse(apiApplicationMutationResponseSchema, value).application
            );

            await queryClient.refetchQueries({ queryKey: apiQueryKey(organizationPath), type: 'active' });
            await queryClient.invalidateQueries({ queryKey: applicationsQueryKey() });
        },
    });

    return {
        inviteMember: inviteMemberMutation.mutateAsync,
        isInviting: inviteMemberMutation.isPending,
        canInviteMembers,
        changeMemberRole: changeMemberRoleMutation.mutateAsync,
        isChangingMemberRole: changeMemberRoleMutation.isPending,
        canManageMembers,
        createApplication: createApplicationMutation.mutateAsync,
        isCreatingApplication: createApplicationMutation.isPending,
        deleteApplication: deleteApplicationMutation.mutateAsync,
        isDeletingApplication: deleteApplicationMutation.isPending,
    };
}

/** Creates a new organization and refreshes the authenticated user cache. */
export function useCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            name,
            compute_id,
            database_id,
            storage_id,
            avatar,
            country,
        }: {
            name: string;
            compute_id: string;
            database_id: string;
            storage_id: string;
            avatar?: string | null;
            country: string;
        }) => {
            return fetchApiJson(
                '/api/organizations',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        compute_id,
                        database_id,
                        storage_id,
                        avatar: avatar?.trim() ?? '',
                        country,
                    }),
                },
                (value) => parseApiResponse(apiOrganizationMutationResponseSchema, value).organization
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey() });
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
                `/api/organizations/${organizationId}`,
                {
                    method: 'DELETE',
                },
                (value) => parseApiResponse(apiOrganizationMutationResponseSchema, value).organization
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey() });
        },
    });
}
