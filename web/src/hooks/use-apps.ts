import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

export type App = {
    id: number;
    name: string;
    url: string;
};

type CreateAppPayload = {
    url: string;
    token: string;
};

export function useApps() {
    return useQuery({
        queryKey: ['apps'],
        queryFn: () => apiFetch<App[]>('/apps'),
    });
}

export function useCreateApp() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateAppPayload) =>
            apiFetch<App>('/apps', {
                method: 'POST',
                body: payload,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['apps'] });
        },
    });
}
