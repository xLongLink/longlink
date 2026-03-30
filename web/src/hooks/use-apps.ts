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
        queryKey: ['tools'],
        queryFn: () => apiFetch<App[]>('/tools'),
    });
}

export function useSpaces() {
    return useQuery({
        queryKey: ['spaces'],
        queryFn: () => apiFetch<App[]>('/spaces'),
    });
}

export function useProcesses() {
    return useQuery({
        queryKey: ['processes'],
        queryFn: () => apiFetch<App[]>('/processes'),
    });
}
