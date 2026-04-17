import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    oauth_github_id?: number | null;
    date_creation?: string;
};

/** Hook that fetches the current user. */
export function useUser() {
    return useQuery({
        queryKey: ['user'],
        queryFn: () => apiFetch<User>('/user'),
        staleTime: Infinity,
    });
}

export function useSignOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            apiFetch('/logout', {
                method: 'GET',
                credentials: 'include',
            }),
        onSuccess: () => {
            queryClient.setQueryData(['user'], null);
        },
    });
}
