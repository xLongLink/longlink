import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
        queryKey: ['api', '/auth/me'],
        queryFn: async () => {
            const response = await fetch('/auth/me', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as User;
        },
    });
}

export function useSignOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => fetch('/auth/logout', { credentials: 'same-origin' }),
        /**
         * Clears the cached user after a successful sign-out.
         */
        onSuccess: () => {
            queryClient.setQueryData(['api', '/auth/me'], null);
            queryClient.invalidateQueries({ queryKey: ['api', '/auth/me'] });
        },
    });
}
