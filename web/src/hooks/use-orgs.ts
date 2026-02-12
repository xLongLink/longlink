import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

export type Organization = {
    id: number;
    name: string;
    country: string;
    crn?: string | null;
    vat?: string | null;
    date_creation?: string;
};

export type CreateOrganizationPayload = {
    name: string;
    country: string;
    crn?: string;
    vat?: string;
};

type UseOrgsResult = {
    orgs: Organization[];
    isLoading: boolean;
    isCreating: boolean;
    error: string | null;
    refreshOrgs: () => Promise<void>;
    createOrg: (payload: CreateOrganizationPayload) => Promise<Organization>;
};

export function useOrgs(): UseOrgsResult {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshOrgs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiFetch<Organization[]>('/user/orgs', {
                credentials: 'include',
            });
            setOrgs(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load organizations.'
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createOrg = useCallback(
        async (payload: CreateOrganizationPayload) => {
            setIsCreating(true);
            setError(null);
            try {
                const response = await apiFetch<Organization>('/org', {
                    method: 'POST',
                    credentials: 'include',
                    body: payload,
                });
                setOrgs((prev) => [...prev, response]);
                return response;
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : 'Unable to create organization.';
                setError(message);
                throw new Error(message);
            } finally {
                setIsCreating(false);
            }
        },
        []
    );

    useEffect(() => {
        void refreshOrgs();
    }, [refreshOrgs]);

    return useMemo(
        () => ({
            orgs,
            isLoading,
            isCreating,
            error,
            refreshOrgs,
            createOrg,
        }),
        [orgs, isLoading, isCreating, error, refreshOrgs, createOrg]
    );
}
