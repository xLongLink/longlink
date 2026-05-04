import { createElement, useState, type ComponentProps, type ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { For } from './primitives/For';
import { Grid } from './primitives/Grid';
import { Query } from './primitives/Query';
import { State } from './primitives/State';
import type { ActionHandler, ActionProps, ActionComponentProps, ExecutionContext, RegistryShape } from './types';
import { resolveValue, useRuntime } from './runtime';

import { Button } from './components/Button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/Card';
import Checkbox from './components/Checkbox';
import Hero from './components/Hero';
import { Icon } from './components/Icon';
import Input from './components/Input';
import Menu, { MenuSection, MenuSubSection } from './components/Menu';
import Select from './components/Select';
import Separator from './components/Separator';
import Slider from './components/Slider';
import Switch from './components/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/Table';
import Textarea from './components/Textarea';
import { Blockquote } from './html/Blockquote';
import { H1 } from './html/H1';
import { H2 } from './html/H2';
import { H3 } from './html/H3';
import { H4 } from './html/H4';
import { Li } from './html/Li';
import { P } from './html/P';
import { Ul } from './html/Ul';

import Columns, { Column } from './layout/Columns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './layout/Dialog';
import Stack from './layout/Stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './layout/Tabs';
import Page from './primitives/Page';

/**
 * Creates a minimal ExecutionContext with empty state, queries, and scope.
 * Accepts optional partial overrides for any of the three fields.
 */
export function createContext(initial: Partial<ExecutionContext> = {}): ExecutionContext {
    return {
        state: initial.state ?? {},
        queries: initial.queries ?? {},
        scope: initial.scope ?? {},
        baseUrl: initial.baseUrl ?? '',
    };
}

/* Build the built-in XML component registry once at module load. */
const defaultRegistry = {
    Page,
    Query,
    State,
    For,
    Grid,
    Button: action(Button),
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Checkbox,
    Columns,
    Column,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Hero,
    Icon,
    Input,
    Li,
    Menu,
    MenuSection,
    MenuSubSection,
    Select,
    Separator,
    Slider,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Textarea,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    p: P,
    blockquote: Blockquote,
    ul: Ul,
    li: Li,
} satisfies RegistryShape;

export const registry = defaultRegistry;

// ---------------------------------------------------------------------------
// action
// ---------------------------------------------------------------------------

/**
 * Normalizes the `invalidate` prop into an array of query keys.
 * Accepts a string (comma-separated), an array, or an invalid value.
 */
/**
 * Normalizes invalidate targets into a list of query keys.
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
/**
 * Builds request options for XML actions.
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
        if (typeof body === 'string') {
            const trimmedBody = body.trim();

            /* Preserve JSON string payloads as application/json for API handlers. */
            if (
                (trimmedBody.startsWith('{') && trimmedBody.endsWith('}')) ||
                (trimmedBody.startsWith('[') && trimmedBody.endsWith(']'))
            ) {
                return {
                    method,
                    body,
                    headers: { 'content-type': 'application/json' },
                };
            }
        }

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
 * Reads a submit response into a short toast message.
 */
/**
 * Reads a short status message from an action response.
 */
async function readResponseMessage(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';

    /* Prefer a concise JSON message when API responses provide one. */
    if (contentType.includes('application/json')) {
        const data = (await response.json()) as unknown;

        if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
            return data.message;
        }

        return JSON.stringify(data);
    }

    /* Fall back to response text, keeping empty responses readable. */
    const message = await response.text();
    return message || 'Request completed';
}

/**
 * Resolves action payload values using runtime context.
 *
 * - Strings wrapped as `{expression}` are evaluated and can return non-string values.
 * - Arrays and plain objects are traversed recursively.
 * - Non-plain objects (FormData, Blob, Date, URLSearchParams, etc.) are preserved.
 */
/**
 * Resolves templated payload values against the runtime context.
 */
function resolveActionPayload(value: unknown, ctx: ExecutionContext): unknown {
    if (typeof value === 'string') {
        return resolveValue(value, ctx);
    }

    if (Array.isArray(value)) {
        /* Resolve nested template values for every array item. */
        return value.map((entry) => resolveActionPayload(entry, ctx));
    }

    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        /* Resolve nested template values for plain object properties. */
        const resolvedEntries = Object.entries(value).map(([key, entry]) => [key, resolveActionPayload(entry, ctx)]);
        return Object.fromEntries(resolvedEntries);
    }

    return value;
}

/**
 * Higher-order component that injects `action` and `pending` props into the
 * wrapped component. The `action` handler calls `path` with `method` and `body`,
 * then invalidates the listed query keys on success.
 */
export function action<TComponent extends ComponentType<any>>(Component: TComponent) {
    type Props = Omit<ComponentProps<TComponent>, keyof ActionComponentProps> & ActionProps;

    /**
     * Evaluates a successful action callback.
     * Supports either a function callback or a script string with `refetch(...)` and `set(...)`.
     */
    async function executeOnSuccess(
        onSuccess: ActionProps['onSuccess'],
        helpers: { refetch: (key: string) => Promise<void>; set: (target: string, value: unknown) => void }
    ): Promise<void> {
        if (!onSuccess) {
            return;
        }

        if (typeof onSuccess === 'function') {
            await onSuccess();
            return;
        }

        /* Execute XML script snippets with explicit helper bindings. */
        const runScript = new Function('refetch', 'set', onSuccess) as (
            refetch: (key: string) => Promise<void>,
            set: (target: string, value: unknown) => void
        ) => unknown;
        await runScript(helpers.refetch, helpers.set);
    }

    function ActionComponent({
        path,
        action: actionPath,
        url,
        method = 'POST',
        body,
        payload,
        invalidate,
        onSuccess,
        ...props
    }: Props) {
        const queryClient = useQueryClient();
        const [pending, setPending] = useState(false);
        const runtime = useRuntime();
        const resolvedPath = path ?? actionPath ?? url;

        const { _baseUrl: _unusedBaseUrl, ...restProps } = props as ComponentProps<TComponent> & { _baseUrl?: string };

        /* Execute request, then invalidate listed query keys on success */
        const handleAction: ActionHandler = async (event) => {
            event.preventDefault();

            if (!resolvedPath || pending) return;

            setPending(true);

            try {
                const baseUrl = runtime.ctx.baseUrl ?? '';
                const resolvedRequestPath = String(resolveValue(resolvedPath, runtime.ctx));
                const requestUrl = resolvedRequestPath.startsWith('http')
                    ? resolvedRequestPath
                    : `${baseUrl}${resolvedRequestPath}`;
                const requestBody = resolveActionPayload(body ?? payload, runtime.ctx);
                const response = await fetch(requestUrl, buildRequestInit(method.toUpperCase(), requestBody));
                const responseMessage = await readResponseMessage(response);

                if (!response.ok) {
                    toast.error(responseMessage || `Request failed with status ${response.status}`);
                    return;
                }

                toast.success(responseMessage);

                for (const queryKey of normalizeInvalidate(invalidate)) {
                    await queryClient.invalidateQueries({ queryKey: [queryKey] });
                }

                await executeOnSuccess(onSuccess, {
                    refetch: async (key) => queryClient.invalidateQueries({ queryKey: [key] }),
                    set: (target, value) => {
                        const stateEntry = runtime.ctx.state[target];

                        if (!stateEntry) {
                            throw new Error(`set: unknown state "${target}"`);
                        }

                        const [, setter] = stateEntry;
                        setter(value);
                    },
                });
            } finally {
                setPending(false);
            }
        };

        /* Inject action handler and pending state into wrapped component */
        return createElement(Component as ComponentType<any>, {
            ...restProps,
            action: handleAction,
            pending,
        });
    }

    ActionComponent.displayName = `Action(${Component.displayName ?? Component.name ?? 'Component'})`;

    return ActionComponent;
}
