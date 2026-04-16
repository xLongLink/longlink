import { createElement, useState, type ComponentProps, type ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { For } from './primitives/For';
import { Grid } from './primitives/Grid';
import { Page } from './primitives/Page';
import { Query } from './primitives/Query';
import { State } from './primitives/State';
import type { ActionHandler, ActionProps, ActionComponentProps, ExecutionContext, RegistryShape } from './types';

/**
 * Creates a minimal ExecutionContext with empty state, queries, and scope.
 * Accepts optional partial overrides for any of the three fields.
 */
export function createContext(initial: Partial<ExecutionContext> = {}): ExecutionContext {
    return {
        state: initial.state ?? {},
        queries: initial.queries ?? {},
        scope: initial.scope ?? {},
    };
}

const defaultPrimitives = {
    Page,
    Query,
    State,
    For,
    Grid,
} satisfies RegistryShape;

/**
 * Creates a component registry by merging the built-in primitives with the
 * provided custom components. Custom components override primitives with the
 * same name.
 */
export function createRegistry<const TRegistry extends RegistryShape>(
    registry: TRegistry
): typeof defaultPrimitives & TRegistry {
    return {
        ...defaultPrimitives,
        ...registry,
    };
}

// ---------------------------------------------------------------------------
// action
// ---------------------------------------------------------------------------

/**
 * Normalizes the `invalidate` prop into an array of query keys.
 * Accepts a string (comma-separated), an array, or an invalid value.
 */
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

/**
 * Builds a RequestInit object from method and body.
 * Handles native body types (FormData, URLSearchParams, Blob, string) directly,
 * serializing all other values as JSON with a content-type header.
 */
function buildRequestInit(method: string, body: unknown): RequestInit {
    if (method === 'GET' || method === 'HEAD' || body === undefined) {
        return { method };
    }

    /* Pass native body types through as-is */
    if (
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        body instanceof Blob ||
        typeof body === 'string'
    ) {
        return { method, body };
    }

    /* Serialize unknown types as JSON */
    return {
        method,
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    };
}

/**
 * Higher-order component that injects `action` and `pending` props into the
 * wrapped component. The `action` handler calls `path` with `method` and `body`,
 * then invalidates the listed query keys on success.
 */
export function action<TComponent extends ComponentType<any>>(Component: TComponent) {
    type Props = Omit<ComponentProps<TComponent>, keyof ActionComponentProps> & ActionProps;

    function ActionComponent({ path, method = 'POST', body, invalidate, ...props }: Props) {
        const queryClient = useQueryClient();
        const [pending, setPending] = useState(false);

        /* Execute request, then invalidate listed query keys on success */
        const handleAction: ActionHandler = async (event) => {
            event.preventDefault();

            if (!path || pending) return;

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

        /* Inject action handler and pending state into wrapped component */
        return createElement(Component as ComponentType<any>, {
            ...(props as ComponentProps<TComponent>),
            action: handleAction,
            pending,
        });
    }

    ActionComponent.displayName = `Action(${Component.displayName ?? Component.name ?? 'Component'})`;

    return ActionComponent;
}
