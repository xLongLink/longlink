import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiUrl } from '@/lib/api';
import type { ApiOrgApp, ApiOrgDetails, ApiResponse, ApiUserSummary } from '@/lib/types';

type UseOrgResult = {
    org: ApiOrgDetails | undefined;
    people: ApiUserSummary[];
    apps: ApiOrgApp[];
    isLoading: boolean;
    error: (Error & { status?: number }) | null;
};

/** Fetches org details and related collections for the current workspace. */
export function useOrg(org: string): UseOrgResult {
    const orgUrl = apiUrl(`/api/orgs/${org}`);

    const organizationQuery = useQuery({
        queryKey: ['api', orgUrl],
        queryFn: async () => {
            const response = await fetch(orgUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const error = new Error(`API request failed (${response.status})`) as Error & { status: number };
                error.status = response.status;
                throw error;
            }

            const payload = (await response.json()) as ApiResponse<ApiOrgDetails>;

            if (!payload.data) {
                throw new Error('Unexpected response format');
            }

            return payload.data;
        },
        enabled: org.length > 0,
        retry: false,
    });

    const error = organizationQuery.error ?? null;

    return {
        org: organizationQuery.data,
        people: organizationQuery.data?.users ?? [],
        apps: organizationQuery.data?.apps ?? [],
        isLoading: organizationQuery.isLoading,
        error,
    };
}

/** Creates a new organization and refreshes the authenticated user cache. */
export function useCreateOrg() {
    const queryClient = useQueryClient();
    const orgsUrl = apiUrl('/api/orgs');
    const userUrl = apiUrl('/api/me');

    return useMutation({
        mutationFn: async (orgName: string) => {
            const response = await fetch(orgsUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name: orgName }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return (await response.json()) as ApiResponse<null>;
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
        mutationFn: async (orgName: string) => {
            const response = await fetch(apiUrl(`/api/orgs/${encodeURIComponent(orgName)}`), {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return null;
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
    const appsUrl = apiUrl(`/api/apps?organization=${encodeURIComponent(org)}`);

    return useMutation({
        mutationFn: async (payload: { name: string; image: string }) => {
            const response = await fetch(appsUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return (await response.json()) as ApiResponse<null>;
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
        mutationFn: async (appId: number) => {
            const response = await fetch(apiUrl(`/api/apps/${appId}?organization=${encodeURIComponent(org)}`), {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return null;
        },
        onSuccess: (_data, appId) => {
            queryClient.setQueryData<ApiOrgDetails>(['api', orgUrl], (current) =>
                current ? { ...current, apps: current.apps.filter((app) => app.id !== appId) } : current
            );
            queryClient.invalidateQueries({ queryKey: ['api', orgUrl] });
        },
    });
}
