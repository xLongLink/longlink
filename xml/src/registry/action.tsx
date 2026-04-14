import { createElement, useState, type ComponentProps, type ComponentType, type MouseEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type ActionHandler = (event: MouseEvent<any>) => Promise<void>;

export type ActionProps = {
    path?: string;
    method?: string;
    body?: unknown;
    invalidate?: string | string[];
};

export type ActionComponentProps = {
    action: ActionHandler;
    pending: boolean;
};

function normalizeInvalidate(value: ActionProps['invalidate']): string[] {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return [];
    }

    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function buildRequestInit(method: string, body: unknown): RequestInit {
    if (method === 'GET' || method === 'HEAD' || body === undefined) {
        return { method };
    }

    if (
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof Blob ||
        typeof body === 'string'
    ) {
        return {
            method,
            body,
        };
    }

    return {
        method,
        body: JSON.stringify(body),
        headers: {
            'content-type': 'application/json',
        },
    };
}

export function action<TComponent extends ComponentType<any>>(Component: TComponent) {
    type Props = Omit<ComponentProps<TComponent>, keyof ActionComponentProps> & ActionProps;

    function ActionComponent({ path, method = 'POST', body, invalidate, ...props }: Props) {
        const queryClient = useQueryClient();
        const [pending, setPending] = useState(false);

        const handleAction: ActionHandler = async (event) => {
            event.preventDefault();

            if (!path || pending) {
                return;
            }

            setPending(true);

            try {
                const response = await fetch(path, buildRequestInit(method.toUpperCase(), body));

                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                for (const queryKey of normalizeInvalidate(invalidate)) {
                    await queryClient.invalidateQueries({ queryKey: [queryKey] });
                }
            } finally {
                setPending(false);
            }
        };

        return createElement(Component as ComponentType<any>, {
            ...(props as ComponentProps<TComponent>),
            action: handleAction,
            pending,
        });
    }

    ActionComponent.displayName = `Action(${Component.displayName ?? Component.name ?? 'Component'})`;

    return ActionComponent;
}
