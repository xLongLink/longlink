import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';

export type ManagedUser = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    oauth_github_id?: number | null;
};

type UseUsersResult = {
    users: ManagedUser[];
    isLoading: boolean;
    error: string | null;
    refreshUsers: () => Promise<void>;
};

export function useUsers(): UseUsersResult {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiFetch<ManagedUser[]>('/users', {
                credentials: 'include',
            });
            setUsers(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshUsers();
    }, [refreshUsers]);

    return useMemo(
        () => ({
            users,
            isLoading,
            error,
            refreshUsers,
        }),
        [users, isLoading, error, refreshUsers]
    );
}
