import { useQuery } from '@tanstack/react-query';

type Org = {
    name: string;
    users?: OrgPerson[];
};

type OrgApp = {
    name: string;
    url: string;
};

type OrgPerson = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
};

type UseOrgResult = {
    org: Org | undefined;
    people: OrgPerson[];
    apps: OrgApp[];
    isLoading: boolean;
    error: Error | null;
};

/** Fetches org details and related collections for the current workspace. */
export function useOrg(org: string): UseOrgResult {
    const organizationQuery = useQuery({
        queryKey: ['api', `/api/orgs/${org}`],
        queryFn: async () => {
            const response = await fetch(`/api/orgs/${org}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as { org: Org };
            return payload.org;
        },
        enabled: org.length > 0,
        retry: false,
    });

    const appsQuery = useQuery({
        queryKey: ['api', `/api/apps?organization=${org}`],
        queryFn: async () => {
            const response = await fetch(`/api/apps?organization=${encodeURIComponent(org)}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
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
