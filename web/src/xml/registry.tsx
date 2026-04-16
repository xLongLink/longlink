import { createElement, useState, type ComponentProps, type ComponentType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { For } from './primitives/For';
import { Grid } from './primitives/Grid';
import { Page as PrimitivesPage } from './primitives/Page';
import { Query } from './primitives/Query';
import { State } from './primitives/State';
import type { ActionHandler, ActionProps, ActionComponentProps, ExecutionContext, RegistryShape } from './types';

import { Button } from './components/Button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/Card';
import Checkbox from './components/Checkbox';
import { Icon } from './components/Icon';
import Input from './components/Input';
import Menu, { MenuSection, MenuSubSection } from './components/Menu';
import Range from './components/Range';
import Select from './components/Select';
import Separator from './components/Separator';
import Slider from './components/Slider';
import Switch from './components/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/Table';
import Textarea from './components/Textarea';
import { Blockquote, Code, H1, H2, H3, H4, Li, P, Ul } from './components/Typography';

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
import Hero from './layout/Hero';
import Page from './layout/Page';
import Stack from './layout/Stack';
import { Tabs, TabsList, TabsTrigger } from './layout/Tabs';

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

const defaultRegistry = {
    Page,
    PrimitivesPage,
    Query,
    State,
    For,
    Grid,
    Button,
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
    Range,
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
    Blockquote,
    Code,
    H1,
    H2,
    H3,
    H4,
    P,
    Ul,
    Tabs,
    TabsList,
    TabsTrigger,
} satisfies RegistryShape;

export const registry = defaultRegistry;

/**
 * Creates a component registry by merging the built-in primitives with the
 * provided custom components. Custom components override primitives with the
 * same name.
 */
export function createRegistry<const TRegistry extends RegistryShape>(
    customRegistry: TRegistry
): typeof defaultRegistry & TRegistry {
    return {
        ...defaultRegistry,
        ...customRegistry,
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
        const baseUrl = (props as any)._baseUrl ?? '';

        /* Execute request, then invalidate listed query keys on success */
        const handleAction: ActionHandler = async (event) => {
            event.preventDefault();

            if (!path || pending) return;

            setPending(true);

            try {
                const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
                const response = await fetch(url, buildRequestInit(method.toUpperCase(), body));

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
