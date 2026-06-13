import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiUrl, fetchApiJson, fetchApiVoid } from '@/lib/api';
import type {
    ApiAppResponse,
    ApiInvitation,
    ApiOrgApp,
    ApiOrgDetails,
    ApiOrgSummary,
    ApiUserSummary,
} from '@/lib/types';

type UseOrgResult = {
    org: ApiOrgDetails | undefined;
    people: ApiUserSummary[];
    invitations: ApiInvitation[];
    apps: ApiOrgApp[];
    isLoading: boolean;
    error: (Error & { status?: number }) | null;
};

/** Fetches org details and related collections for the current workspace. */
export function useOrg(org: string): UseOrgResult {
    const orgUrl = apiUrl(`/api/orgs/${org}`);

    const organizationQuery = useQuery({
        queryKey: ['api', orgUrl],
        queryFn: async () => fetchApiJson<ApiOrgDetails>(orgUrl, { credentials: 'include' }),
        enabled: org.length > 0,
        retry: false,
    });

    const error = organizationQuery.error ?? null;

    return {
        org: organizationQuery.data,
        people: organizationQuery.data?.users ?? [],
        invitations: organizationQuery.data?.invitations ?? [],
        apps: organizationQuery.data?.applications ?? [],
        isLoading: organizationQuery.isLoading,
        error,
    };
}

/** Sends an invitation for a user to join an organization. */
export function useInviteUser(org: string) {
    const queryClient = useQueryClient();
    const orgUrl = apiUrl(`/api/orgs/${org}`);

    return useMutation({
        mutationFn: async ({ email, role }: { email: string; role: string }) => {
            return fetchApiVoid(apiUrl(`/api/orgs/${encodeURIComponent(org)}/invitations`), {
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
        mutationFn: async ({ name, location_id }: { name: string; location_id: string }) => {
            return fetchApiJson<ApiOrgSummary>(orgsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, location_id }),
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
    const userUrl = apiUrl('/api/me');

    return useMutation({
        mutationFn: async (orgId: string) => {
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
    const orgUrl = apiUrl(`/api/orgs/${org}`);
    const appsUrl = apiUrl(`/api/apps?organization_id=${encodeURIComponent(org)}`);

    return useMutation({
        mutationFn: async (payload: {
            name: string;
            image: string;
            description?: string | null;
            icon?: string | null;
            envs: Record<string, string>;
        }) => {
            return fetchApiJson<ApiAppResponse>(appsUrl, {
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
    const orgUrl = apiUrl(`/api/orgs/${org}`);

    return useMutation({
        mutationFn: async (appId: string) => {
            await fetchApiVoid(apiUrl(`/api/apps/${appId}?organization_id=${encodeURIComponent(org)}`), {
                method: 'DELETE',
                credentials: 'include',
            });
        },
        onSuccess: (_data, appId) => {
            queryClient.setQueryData<ApiOrgDetails>(['api', orgUrl], (current) =>
                current ? { ...current, applications: current.applications.filter((app) => app.id !== appId) } : current
            );
            queryClient.invalidateQueries({ queryKey: ['api', orgUrl] });
        },
    });
}
