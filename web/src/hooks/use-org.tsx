import { useQuery } from '@tanstack/react-query';

type Organization = {
    name: string;
};

type OrganizationApp = {
    name: string;
    url: string;
};

type OrganizationPerson = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
};

type UseOrgResult = {
    organization: Organization | undefined;
    people: OrganizationPerson[];
    apps: OrganizationApp[];
    isLoading: boolean;
    error: Error | null;
};

/** Fetches organization details and related collections for the current workspace. */
export function useOrg(org: string): UseOrgResult {
    const organizationQuery = useQuery({
        queryKey: ['api', `/api/organizations/${org}`],
        queryFn: async () => {
            const response = await fetch(`/api/organizations/${org}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as { organization: Organization };
            return payload.organization;
        },
        enabled: org.length > 0,
        retry: false,
    });

    const peopleQuery = useQuery({
        queryKey: ['api', `/api/orgs/${org}/people`],
        queryFn: async () => {
            const response = await fetch(`/api/orgs/${org}/people`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as OrganizationPerson[];
        },
        enabled: org.length > 0,
        retry: false,
    });

    const appsQuery = useQuery({
        queryKey: ['api', `/api/orgs/${org}/apps`],
        queryFn: async () => {
            const response = await fetch(`/api/orgs/${org}/apps`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as OrganizationApp[];
        },
        enabled: org.length > 0,
        retry: false,
    });

    const error = organizationQuery.error ?? peopleQuery.error ?? appsQuery.error ?? null;

    return {
        organization: organizationQuery.data,
        people: peopleQuery.data ?? [],
        apps: appsQuery.data ?? [],
        isLoading: organizationQuery.isLoading || peopleQuery.isLoading || appsQuery.isLoading,
        error,
    };
}
