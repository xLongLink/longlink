import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useApiQuery } from '@/hooks/use-api';
import { useUser } from '@/hooks/use-user';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
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

/** Resolves one route organization slug to its canonical UUID. */
export function resolveOrganizationId(organizationSlug: string, organizations: ApiUserOrganizationMembership[]): string {
    const organization = organizations.find((item) => item.name === organizationSlug);
    return organization?.id ?? '';
}

/** Fetches organization details and related collections for the current workspace. */
export function useOrganization(organizationSlug: string): UseOrganizationResult {
    const { organizations, isLoading: isUserLoading } = useUser();
    const organizationId = useMemo(() => resolveOrganizationId(organizationSlug, organizations), [organizationSlug, organizations]);
    const organizationPath = `/api/organizations/${organizationId}`;

    const missingOrganization = !isUserLoading && organizationSlug.length > 0 && organizationId.length === 0;

    const organizationQuery = useApiQuery<ApiOrganizationDetails>(organizationPath, {
        enabled: organizationId.length > 0,
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

/** Sends an invitation for a user to join an organization. */
export function useInviteOrganizationMember(organizationSlug: string) {
    const queryClient = useQueryClient();
    const { organizations } = useUser();
    const organizationId = useMemo(() => resolveOrganizationId(organizationSlug, organizations), [organizationSlug, organizations]);
    const organizationPath = `/api/organizations/${organizationId}`;

    return useMutation({
        mutationFn: async ({ email, role }: { email: string; role: string }) => {
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            return fetchApiVoid(`/api/organizations/${organizationId}/invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });
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
    const { organizations } = useUser();

    return useMutation({
        mutationFn: async (organizationSlug: string) => {
            const organizationId = resolveOrganizationId(organizationSlug, organizations);
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

/** Creates a new application in one organization and refreshes the app list cache. */
export function useCreateApplication(organizationSlug: string) {
    const queryClient = useQueryClient();
    const { organizations } = useUser();
    const organizationId = useMemo(() => resolveOrganizationId(organizationSlug, organizations), [organizationSlug, organizations]);
    const organizationPath = `/api/organizations/${organizationId}`;
    const applicationsPath = `/api/applications?organization_id=${organizationId}`;

    return useMutation({
        mutationFn: async (payload: {
            name: string;
            image: string;
            description?: string | null;
            icon?: string | null;
            envs: Record<string, string>;
        }) => {
            return fetchApiJson<ApiApplicationResponse>(applicationsPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });
}

/** Deletes an application from one organization and refreshes the app list cache. */
export function useDeleteApplication(organizationSlug: string) {
    const queryClient = useQueryClient();
    const { organizations } = useUser();
    const organizationId = useMemo(() => resolveOrganizationId(organizationSlug, organizations), [organizationSlug, organizations]);
    const organizationPath = `/api/organizations/${organizationId}`;

    return useMutation({
        mutationFn: async (applicationId: string) => {
            if (!organizationId) {
                throw new Error('Organization not found');
            }

            await fetchApiVoid(`/api/applications/${applicationId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: (_data, applicationId) => {
            queryClient.setQueryData<ApiOrganizationDetails>(apiQueryKey(organizationPath), (current) =>
                current ? { ...current, applications: current.applications.filter((application) => application.id !== applicationId) } : current
            );
            queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationPath) });
        },
    });
}
