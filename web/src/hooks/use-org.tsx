import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiUrl } from '@/lib/api';
import type { Role } from '@/lib/roles';

type Org = {
    name: string;
    users?: OrgPerson[];
};

type OrgApp = {
    name: string;
    url: string;
    role: Role;
};

type OrgCreateResponse = {
    org: {
        name: string;
        role: Role;
    };
};

type CachedUser = {
    orgs?: {
        name: string;
        role: Role;
    }[];
};

type OrgPerson = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role: Role;
};

type UseOrgResult = {
    org: Org | undefined;
    people: OrgPerson[];
    apps: OrgApp[];
    isLoading: boolean;
    error: (Error & { status?: number }) | null;
};

/** Fetches org details and related collections for the current workspace. */
export function useOrg(org: string): UseOrgResult {
    const orgUrl = apiUrl(`/api/orgs/${org}`);
    const appsUrl = apiUrl(`/api/apps?organization=${encodeURIComponent(org)}`);

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

            const payload = (await response.json()) as { org: Org };
            return payload.org;
        },
        enabled: org.length > 0,
        retry: false,
    });

    const appsQuery = useQuery({
        queryKey: ['api', appsUrl],
        queryFn: async () => {
            const response = await fetch(appsUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const error = new Error(`API request failed (${response.status})`) as Error & { status: number };
                error.status = response.status;
                throw error;
            }

            return (await response.json()) as OrgApp[];
        },
        enabled: org.length > 0,
        retry: false,
    });

    const error = organizationQuery.error ?? appsQuery.error ?? null;

    return {
        org: organizationQuery.data,
        people: organizationQuery.data?.users ?? [],
        apps: appsQuery.data ?? [],
        isLoading: organizationQuery.isLoading || appsQuery.isLoading,
        error,
    };
}

/** Creates a new organization and keeps the cached user memberships in sync. */
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

            return (await response.json()) as OrgCreateResponse;
        },
        onSuccess: (payload) => {
            // Merge the new org into the cached user memberships so the list updates immediately.
            queryClient.setQueryData<CachedUser | null>(['api', userUrl], (current) => {
                if (!current) {
                    return current;
                }

                const org = payload.org;
                const orgs = current.orgs ?? [];

                if (orgs.some((existingOrg) => existingOrg.name === org.name)) {
                    return current;
                }

                return {
                    ...current,
                    orgs: [...orgs, org],
                };
            });

            queryClient.invalidateQueries({ queryKey: ['api', userUrl] });
        },
    });
}
