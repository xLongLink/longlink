import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

export type App = {
    id: string;
    name: string;
    url: string;
    type: 'tool' | 'space' | 'process';
};

type CreateAppPayload = {
    url: string;
    key: string;
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

export function useTools() {
    return useQuery({
        queryKey: ['apps', 'tool'],
        queryFn: () =>
            apiFetch<App[]>('/apps', {
                query: { type: 'tool' },
            }),
    });
}

export function useSpaces() {
    return useQuery({
        queryKey: ['apps', 'space'],
        queryFn: () =>
            apiFetch<App[]>('/apps', {
                query: { type: 'space' },
            }),
    });
}

export function useProcesses() {
    return useQuery({
        queryKey: ['apps', 'process'],
        queryFn: () =>
            apiFetch<App[]>('/apps', {
                query: { type: 'process' },
            }),
    });
}
