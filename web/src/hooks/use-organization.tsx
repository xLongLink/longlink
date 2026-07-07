import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiQuery } from '@/hooks/use-api';
import { useUserProfile } from '@/hooks/use-user';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import { applicationsQueryKey, organizationsQueryKey } from '@/lib/query-keys';
import type { Role } from '@/lib/roles';
import type {
    ApiApplicationResponse,
    ApiInvitation,
    ApiOrganizationApplication,
    ApiOrganizationDetails,
    ApiOrganizationMemberSummary,
    ApiOrganizationSummary,
    ApiUserOrganizationMembership,
} from '@/lib/types';

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
    const canInviteMembers = organizationMembership?.role
        ? ['admin', 'maintain', 'owner'].includes(organizationMembership.role)
        : false;
    const canManageMembers = organizationMembership?.role
        ? ['admin', 'owner'].includes(organizationMembership.role)
        : false;

    const inviteMemberMutation = useMutation({
        mutationFn: async ({ email, role }: { email: string; role: Role }) => {
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

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
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

            return fetchApiJson<ApiApplicationResponse>(`/api/organizations/${organizationId}/applications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, image, description, icon, envs }),
            });
        },
        onSuccess: async () => {
            if (organizationPath === null) {
                return;
            }

            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
            await queryClient.invalidateQueries({ queryKey: applicationsQueryKey() });
        },
    });

    const changeMemberRoleMutation = useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: Role }) => {
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

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
            if (organizationPath === null) {
                return;
            }

            await queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/me') });
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey() });
            await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });

    const deleteApplicationMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            if (organizationPath === null) {
                throw new Error('Organization not found');
            }

            await fetchApiVoid(`/api/applications/${applicationId}`, {
                method: 'DELETE',
            });

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
            location_id,
            avatar,
        }: {
            name: string;
            location_id: string;
            avatar?: string | null;
        }) => {
            return fetchApiJson<ApiOrganizationSummary>('/api/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, location_id, avatar: avatar?.trim() ? avatar.trim() : null }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/me') });
        },
    });
}

/** Deletes one organization and refreshes the authenticated user cache. */
export function useDeleteOrganization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (organizationId: string) => {
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await fetchApiVoid(`/api/organizations/${organizationId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/me') });
        },
    });
}
