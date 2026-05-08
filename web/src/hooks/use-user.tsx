import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiData } from '@/hooks/use-data';

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
    return useApiData<User>('/me');
}

export function useSignOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => fetch('/logout', { credentials: 'same-origin' }),
        /**
         * Clears the cached user after a successful sign-out.
         */
        onSuccess: () => {
            queryClient.setQueryData(['user'], null);
        },
    });
}
