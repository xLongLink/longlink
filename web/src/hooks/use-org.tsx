import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useUser } from '@/hooks/use-user';
import { apiUrl, fetchApiJson, fetchApiVoid } from '@/lib/api';
import type {
    ApiApplicationResponse,
    ApiInvitation,
    ApiOrganizationApplication,
    ApiOrganizationDetails,
    ApiOrganizationSummary,
    ApiOrganizationMemberSummary,
    ApiUserOrganizationMembership,
} from '@/lib/types';

type UseOrgResult = {
    org: ApiOrganizationDetails | undefined;
    people: ApiOrganizationMemberSummary[];
    invitations: ApiInvitation[];
    applications: ApiOrganizationApplication[];
    isLoading: boolean;
    error: (Error & { status?: number }) | null;
};

/** Resolves one route organization slug to its canonical UUID. */
export function resolveOrganizationId(org: string, organizations: ApiUserOrganizationMembership[]): string {
    const organization = organizations.find((item) => item.name === org);
    return organization?.id ?? '';
}

/** Fetches org details and related collections for the current workspace. */
export function useOrg(org: string): UseOrgResult {
    const { organizations, isLoading: isUserLoading } = useUser();
    const orgId = useMemo(() => resolveOrganizationId(org, organizations), [org, organizations]);
    const orgUrl = apiUrl(`/api/orgs/${orgId}`);

    const missingOrganization = !isUserLoading && org.length > 0 && orgId.length === 0;

    const organizationQuery = useQuery({
        queryKey: ['api', orgUrl],
        queryFn: async () => fetchApiJson<ApiOrganizationDetails>(orgUrl, { credentials: 'include' }),
        enabled: orgId.length > 0,
        retry: false,
    });

    const error =
        organizationQuery.error ??
        (missingOrganization
            ? (Object.assign(new Error('Organization not found'), { status: 404 }) as Error & { status?: number })
            : null);

    return {
        org: organizationQuery.data,
        people: organizationQuery.data?.users ?? [],
        invitations: organizationQuery.data?.invitations ?? [],
        applications: organizationQuery.data?.applications ?? [],
        isLoading: isUserLoading || organizationQuery.isLoading,
        error,
    };
}

/** Sends an invitation for a user to join an organization. */
export function useInviteUser(org: string) {
    const queryClient = useQueryClient();
    const { organizations } = useUser();
    const orgId = useMemo(() => resolveOrganizationId(org, organizations), [org, organizations]);
    const orgUrl = apiUrl(`/api/orgs/${orgId}`);

    return useMutation({
        mutationFn: async ({ email, role }: { email: string; role: string }) => {
            if (!orgId) {
                throw new Error('Organization not found');
            }

            return fetchApiVoid(apiUrl(`/api/orgs/${encodeURIComponent(orgId)}/invitations`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, role }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api', orgUrl] });
        },
    });
}

/** Creates a new organization and refreshes the authenticated user cache. */
export function useCreateOrg() {
    const queryClient = useQueryClient();
    const orgsUrl = apiUrl('/api/orgs');
    const userUrl = apiUrl('/api/me');

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
            return fetchApiJson<ApiOrganizationSummary>(orgsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, location_id, avatar: avatar?.trim() ? avatar.trim() : null }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api', userUrl] });
        },
    });
}

/** Deletes one organization and refreshes the authenticated user cache. */
export function useDeleteOrg() {
    const queryClient = useQueryClient();
    const { organizations } = useUser();
    const userUrl = apiUrl('/api/me');

    return useMutation({
        mutationFn: async (org: string) => {
            const orgId = resolveOrganizationId(org, organizations);
            if (!orgId) {
                throw new Error('Organization not found');
            }

            await fetchApiVoid(apiUrl(`/api/orgs/${encodeURIComponent(orgId)}`), {
                method: 'DELETE',
                credentials: 'include',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api', userUrl] });
        },
    });
}

/** Creates a new application in one organization and refreshes the app list cache. */
export function useCreateApp(org: string) {
    const queryClient = useQueryClient();
    const { organizations } = useUser();
    const orgId = useMemo(() => resolveOrganizationId(org, organizations), [org, organizations]);
    const orgUrl = apiUrl(`/api/orgs/${orgId}`);
    const appsUrl = apiUrl(`/api/apps?organization_id=${encodeURIComponent(orgId)}`);

    return useMutation({
        mutationFn: async (payload: {
            name: string;
            image: string;
            description?: string | null;
            icon?: string | null;
            envs: Record<string, string>;
        }) => {
            return fetchApiJson<ApiApplicationResponse>(appsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api', orgUrl] });
        },
    });
}

/** Deletes an application from one organization and refreshes the app list cache. */
export function useDeleteApp(org: string) {
    const queryClient = useQueryClient();
    const { organizations } = useUser();
    const orgId = useMemo(() => resolveOrganizationId(org, organizations), [org, organizations]);
    const orgUrl = apiUrl(`/api/orgs/${orgId}`);

    return useMutation({
        mutationFn: async (appId: string) => {
            if (!orgId) {
                throw new Error('Organization not found');
            }

            await fetchApiVoid(apiUrl(`/api/apps/${appId}?organization_id=${encodeURIComponent(orgId)}`), {
                method: 'DELETE',
                credentials: 'include',
            });
        },
        onSuccess: (_data, appId) => {
            queryClient.setQueryData<ApiOrganizationDetails>(['api', orgUrl], (current) =>
                current ? { ...current, applications: current.applications.filter((app) => app.id !== appId) } : current
            );
            queryClient.invalidateQueries({ queryKey: ['api', orgUrl] });
        },
    });
}
