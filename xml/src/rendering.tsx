import { Fragment, createContext, createElement, useContext, useEffect, useId, useMemo, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { FRAGMENT, isArrayNode, isPrimitiveNode } from './utils';
import type {
    ActionRequest,
    ComponentRegistry,
    ReactXMLState,
    ReactXMLStore,
    RenderOptions,
    RuntimeScope,
    XmlElementNode,
    XmlNode,
} from './types';

const LOGIC_COMPONENTS = new Set(['For', 'Query', 'State']);
const EXPRESSION_PATTERN = /^\s*\{([\s\S]*)\}\s*$/;
const TEMPLATE_PATTERN = /\{([^{}]+)\}/g;
const PATH_PATTERN = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const EMPTY_SCOPE: RuntimeScope = { values: {}, bindings: {} };

interface RuntimeContextValue {
    registry: ComponentRegistry;
    store: ReactXMLStore;
    fallback: ReactNode;
    onAction?: RenderOptions['onAction'];
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);
const ScopeContext = createContext<RuntimeScope>(EMPTY_SCOPE);

/**
 * Creates a Zustand store that holds the runtime state for a ReactXML application.
 * Includes global key-value state, query result cache, and per-instance local State node data.
 */
export function createState(initialGlobalState: Record<string, unknown> = {}): ReactXMLStore {
    return createStore<ReactXMLState>((set) => ({
        global: { ...initialGlobalState },
        queries: {},
        localStates: {},
        setGlobalValue(path, value) {
            set((state) => ({
                global: setPathValue(state.global, path, value),
            }));
        },
        setQueryData(id, value) {
            set((state) => ({
                queries: {
                    ...state.queries,
                    [id]: value,
                },
            }));
        },
        initializeLocalState(instanceId, initialState) {
            set((state) => {
                if (state.localStates[instanceId]) {
                    return state;
                }

                return {
                    localStates: {
                        ...state.localStates,
                        [instanceId]: cloneRecord(initialState),
                    },
                };
            });
        },
        removeLocalState(instanceId) {
            set((state) => {
                if (!state.localStates[instanceId]) {
                    return state;
                }

                const nextLocalStates = { ...state.localStates };
                delete nextLocalStates[instanceId];
                return { localStates: nextLocalStates };
            });
        },
        setLocalStateValue(instanceId, path, value) {
            set((state) => ({
                localStates: {
                    ...state.localStates,
                    [instanceId]: setPathValue(state.localStates[instanceId] ?? {}, path, value),
                },
            }));
        },
    }));
}

/**
 * Renders an XmlNode tree into a React element tree using the provided component registry and store.
 * Wraps the output in the runtime context providers (QueryClient, RuntimeContext, ScopeContext).
 */
export function renderNode(
    node: XmlNode,
    registry: ComponentRegistry,
    store = createState(),
    options: RenderOptions = {}
): ReactElement {
    const queryClient = options.queryClient ?? new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <RuntimeContext.Provider
                value={{
                    registry,
                    store,
                    fallback: options.fallback ?? null,
                    onAction: options.onAction,
                }}
            >
                <ScopeContext.Provider value={EMPTY_SCOPE}>
                    <NodeRenderer node={node} />
                </ScopeContext.Provider>
            </RuntimeContext.Provider>
        </QueryClientProvider>
    );
}

/** Dispatches a node to its specialised renderer: primitive, array, logic component, or standard element. */
function NodeRenderer({ node }: { node: XmlNode }): ReactNode {
    if (isPrimitiveNode(node)) {
        return node;
    }

    if (isArrayNode(node)) {
        return node.map((child, index) => (
            <Fragment key={getNodeKey(child, index)}>
                <NodeRenderer node={child} />
            </Fragment>
        ));
    }

    switch (node.type) {
        case 'For':
            return <ForNode node={node} />;
        case 'Query':
            return <QueryNode node={node} />;
        case 'State':
            return <StateNode node={node} />;
        default:
            return <StandardNode node={node} />;
    }
}

/** Renders a regular element node by resolving its props, looking up the component in the registry, and mounting it. */
function StandardNode({ node }: { node: XmlElementNode }): ReactNode {
    const runtime = useRuntime();
    const scope = useScopeValues();
    const queryClient = useQueryClient();

    if (!resolveCondition(node.props?.if, scope)) {
        return null;
    }

    const resolvedProps = resolveProps(node.props, scope);
    const children = renderChildren(node.children);
    const component = resolveComponent(node.type, runtime.registry);
    const bind = typeof node.props?.bind === 'string' ? node.props.bind : undefined;

    if (!component) {
        return runtime.fallback;
    }

    const propsWithoutControl = omitControlProps(resolvedProps);
    const propsWithBinding = bind
        ? applyBindingProps(propsWithoutControl, bind, scope, runtime.store)
        : propsWithoutControl;
    const propsWithAction = applyActionProps(propsWithBinding, node, scope, queryClient, runtime.onAction);

    return createElement(component, propsWithAction, children);
}

/** Executes a data-fetching query via react-query and exposes the result to child nodes through scope. */
function QueryNode({ node }: { node: XmlElementNode }): ReactNode {
    const runtime = useRuntime();
    const scope = useScopeValues();
    const resolvedProps = resolveProps(node.props, scope);
    const id = asRequiredString(resolvedProps.id, 'Query node requires an "id" prop');
    const path = asRequiredString(resolvedProps.path, 'Query node requires a "path" prop');
    const method = normalizeMethod(resolvedProps.method);
    const queryKey = Array.isArray(resolvedProps.queryKey)
        ? resolvedProps.queryKey
        : [id, method, path, resolvedProps.body ?? null];

    const query = useQuery({
        queryKey,
        enabled: resolvedProps.enabled !== false,
        queryFn: async () => {
            const response = await fetch(path, {
                method,
                headers: createRequestHeaders(resolvedProps.body),
                body: shouldSendBody(method, resolvedProps.body) ? JSON.stringify(resolvedProps.body) : undefined,
            });

            if (!response.ok) {
                throw new Error(`Query ${id} failed with status ${response.status}`);
            }

            return readResponseBody(response);
        },
    });

    useEffect(() => {
        if (query.data !== undefined) {
            runtime.store.getState().setQueryData(id, query.data);
        }
    }, [id, query.data, runtime.store]);

    const nextScope = useMemo(
        () =>
            extendScope(scope, {
                values: {
                    [id]: query.data,
                    [`${id}Query`]: query,
                },
            }),
        [id, query, query.data, scope]
    );

    if (!node.children) {
        return null;
    }

    return <ScopeContext.Provider value={nextScope}>{renderChildren(node.children)}</ScopeContext.Provider>;
}

/** Iterates over an array from scope and renders the node's children once per item. */
function ForNode({ node }: { node: XmlElementNode }): ReactNode {
    const scope = useScopeValues();
    const each = resolveIterable(node.props?.each, scope);
    const alias = typeof node.props?.as === 'string' ? node.props.as : 'item';
    const indexAlias = typeof node.props?.indexAs === 'string' ? node.props.indexAs : '$index';

    if (!each.length) {
        return null;
    }

    return each.map((item, index) => {
        const nextScope = extendScope(scope, {
            values: {
                [alias]: item,
                [indexAlias]: index,
            },
        });

        return (
            <ScopeContext.Provider key={getLoopKey(item, index)} value={nextScope}>
                {renderChildren(node.children)}
            </ScopeContext.Provider>
        );
    });
}

/** Creates a keyed local state instance and exposes it as a named scope variable to child nodes. */
function StateNode({ node }: { node: XmlElementNode }): ReactNode {
    const runtime = useRuntime();
    const scope = useScopeValues();
    const id = asRequiredString(node.props?.id, 'State node requires an "id" prop');
    const reactId = useId();
    const instanceId = useMemo(() => `${id}:${reactId.replace(/[:]/g, '_')}`, [id, reactId]);
    const initialStateRef = useRef<Record<string, unknown> | undefined>(undefined);

    if (!initialStateRef.current) {
        initialStateRef.current = extractStateInitialValues(node.props, scope.values);
    }

    useEffect(() => {
        runtime.store.getState().initializeLocalState(instanceId, initialStateRef.current ?? {});

        return () => {
            runtime.store.getState().removeLocalState(instanceId);
        };
    }, [instanceId, runtime.store]);

    const stateSlice = useStore(
        runtime.store,
        (state) => state.localStates[instanceId] ?? initialStateRef.current ?? {}
    );

    const nextScope = useMemo(
        () =>
            extendScope(scope, {
                values: {
                    [id]: stateSlice,
                },
                bindings: {
                    [id]: { stateId: id, instanceId },
                },
            }),
        [id, instanceId, scope, stateSlice]
    );

    return <ScopeContext.Provider value={nextScope}>{renderChildren(node.children)}</ScopeContext.Provider>;
}

/** Returns the current RuntimeContext value, throwing if called outside the ReactXML runtime. */
function useRuntime(): RuntimeContextValue {
    const runtime = useContext(RuntimeContext);
    if (!runtime) {
        throw new Error('renderNode must be used inside the ReactXML runtime');
    }

    return runtime;
}

/** Merges global store state, query data, and the local scope chain into a single flat scope object. */
function useScopeValues(): RuntimeScope {
    const runtime = useRuntime();
    const scope = useContext(ScopeContext);
    const global = useStore(runtime.store, (state) => state.global);
    const queries = useStore(runtime.store, (state) => state.queries);

    return useMemo(
        () => ({
            values: {
                ...global,
                ...queries,
                ...scope.values,
            },
            bindings: {
                ...scope.bindings,
            },
        }),
        [global, queries, scope]
    );
}

/** Converts an XmlNode children value into a React renderable, handling undefined, arrays, and single nodes. */
function renderChildren(children: XmlNode | XmlNode[] | undefined): ReactNode {
    if (children === undefined) {
        return null;
    }

    if (isArrayNode(children)) {
        return children.map((child, index) => (
            <Fragment key={getNodeKey(child, index)}>
                <NodeRenderer node={child} />
            </Fragment>
        ));
    }

    return <NodeRenderer node={children} />;
}

/** Looks up a component by type in the registry, returning Fragment for the fragment type and undefined for logic nodes. */
function resolveComponent(type: string, registry: ComponentRegistry): ComponentRegistry[string] | undefined {
    if (type === FRAGMENT) {
        return Fragment;
    }

    if (LOGIC_COMPONENTS.has(type)) {
        return undefined;
    }

    return registry[type];
}

/** Evaluates an `if` prop value against the current scope; undefined condition always returns true. */
function resolveCondition(condition: unknown, scope: RuntimeScope): boolean {
    if (condition === undefined) {
        return true;
    }

    return Boolean(resolveReference(condition, scope.values));
}

/** Resolves the `each` prop to an array, wrapping non-array values in a single-element array. */
function resolveIterable(input: unknown, scope: RuntimeScope): unknown[] {
    const resolved = resolveReference(input, scope.values);

    if (Array.isArray(resolved)) {
        return resolved;
    }

    if (resolved === null || resolved === undefined) {
        return [];
    }

    return [resolved];
}

/** Resolves all prop values in an element's props map against the current scope. */
function resolveProps(props: Record<string, unknown> | undefined, scope: RuntimeScope): Record<string, unknown> {
    if (!props) {
        return {};
    }

    const resolvedEntries = Object.entries(props).map(([key, value]) => [key, resolveValue(key, value, scope.values)]);

    return Object.fromEntries(resolvedEntries);
}

/** Resolves a single prop value: evaluates `{expression}` syntax, interpolates `{template}` strings, or passes through unchanged. */
function resolveValue(key: string, value: unknown, scope: Record<string, unknown>): unknown {
    if (typeof value === 'string') {
        if (key === 'each') {
            return resolveReference(value, scope);
        }

        const expressionMatch = value.match(EXPRESSION_PATTERN);
        if (expressionMatch) {
            return evaluateExpression(expressionMatch[1] ?? '', scope);
        }

        if (value.includes('{')) {
            return value.replace(TEMPLATE_PATTERN, (_, expression: string) => {
                const resolvedValue = evaluateExpression(expression, scope);
                return resolvedValue == null ? '' : String(resolvedValue);
            });
        }

        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => resolveValue(key, item, scope));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([nestedKey, nestedValue]) => [
                nestedKey,
                resolveValue(nestedKey, nestedValue, scope),
            ])
        );
    }

    return value;
}

/** Resolves a value as an expression or a dot-path reference into the scope, or returns it unchanged. */
function resolveReference(input: unknown, scope: Record<string, unknown>): unknown {
    if (typeof input !== 'string') {
        return input;
    }

    const expressionMatch = input.match(EXPRESSION_PATTERN);
    if (expressionMatch) {
        return evaluateExpression(expressionMatch[1] ?? '', scope);
    }

    if (PATH_PATTERN.test(input)) {
        return getPathValue(scope, input);
    }

    return input;
}

/** Evaluates a JavaScript expression string with the scope object in context using `with`. */
function evaluateExpression(expression: string, scope: Record<string, unknown>): unknown {
    const evaluator = new Function('scope', `with (scope) { return (${expression}); }`);
    return evaluator(scope);
}

/** Extracts the initial state values from a State node's props, resolving expressions but skipping control props. */
function extractStateInitialValues(
    props: Record<string, unknown> | undefined,
    scope: Record<string, unknown>
): Record<string, unknown> {
    if (!props) {
        return {};
    }

    const entries = Object.entries(props).filter(([key]) => key !== 'id' && key !== 'if');

    return Object.fromEntries(entries.map(([key, value]) => [key, resolveValue(key, value, scope)]));
}

/** Injects `value`/`checked` and `onChange` props onto an element to bind it to a State node field. */
function applyBindingProps(
    props: Record<string, unknown>,
    bind: string,
    scope: RuntimeScope,
    store: ReactXMLStore
): Record<string, unknown> {
    const segments = bind.split('.');
    const stateAlias = segments.shift();

    if (!stateAlias) {
        return props;
    }

    const binding = scope.bindings[stateAlias];
    if (!binding) {
        return props;
    }

    const stateValue = scope.values[stateAlias];
    const fieldPath = segments.join('.');
    const currentValue = fieldPath ? getPathValue(stateValue, fieldPath) : stateValue;
    const isBooleanField = typeof currentValue === 'boolean' || props.kind === 'checkbox' || props.type === 'checkbox';

    return {
        ...props,
        ...(isBooleanField ? { checked: Boolean(currentValue) } : { value: currentValue ?? '' }),
        onChange: (nextValue: unknown) => {
            const normalizedValue = normalizeInputValue(nextValue, isBooleanField);
            store.getState().setLocalStateValue(binding.instanceId, fieldPath, normalizedValue);

            if (typeof props.onChange === 'function') {
                props.onChange(nextValue);
            }
        },
    };
}

/** Wraps an element's `onClick` to dispatch a fetch action and invalidate relevant queries on completion. */
function applyActionProps(
    props: Record<string, unknown>,
    node: XmlElementNode,
    scope: RuntimeScope,
    queryClient: QueryClient,
    handler?: RenderOptions['onAction']
): Record<string, unknown> {
    const action = typeof props.action === 'string' ? props.action : undefined;
    if (!action) {
        return props;
    }

    const originalClick = props.onClick;
    const method = normalizeMethod(props.method ?? action);
    const path = typeof props.path === 'string' ? props.path : '';
    const body = props.body;
    const invalidate = props.invalidate as string | string[] | undefined;

    return {
        ...props,
        onClick: async (...args: unknown[]) => {
            if (typeof originalClick === 'function') {
                await originalClick(...args);
            }

            const request: ActionRequest = {
                action,
                method,
                path,
                body,
                invalidate,
                scope: scope.values,
                node,
            };

            if (handler) {
                await handler(request);
            } else {
                await defaultActionHandler(request);
            }

            for (const key of normalizeInvalidate(invalidate)) {
                await queryClient.invalidateQueries({ queryKey: [key] });
            }
        },
    };
}

/** Default action handler: sends a fetch request for the action and returns the parsed response body. */
async function defaultActionHandler(request: ActionRequest): Promise<unknown> {
    const response = await fetch(request.path, {
        method: request.method,
        headers: createRequestHeaders(request.body),
        body: shouldSendBody(request.method, request.body) ? JSON.stringify(request.body) : undefined,
    });

    if (!response.ok) {
        throw new Error(`Action ${request.action} failed with status ${response.status}`);
    }

    return readResponseBody(response);
}

/** Strips ReactXML control props (if, each, as, bind, action, etc.) before passing props to the component. */
function omitControlProps(props: Record<string, unknown>): Record<string, unknown> {
    const nextProps = { ...props };
    delete nextProps.if;
    delete nextProps.each;
    delete nextProps.as;
    delete nextProps.indexAs;
    delete nextProps.bind;
    delete nextProps.action;
    delete nextProps.invalidate;
    return nextProps;
}

/** Returns a new scope that merges the parent scope with additional values and bindings. */
function extendScope(scope: RuntimeScope, patch: Partial<RuntimeScope>): RuntimeScope {
    return {
        values: {
            ...scope.values,
            ...(patch.values ?? {}),
        },
        bindings: {
            ...scope.bindings,
            ...(patch.bindings ?? {}),
        },
    };
}

function normalizeMethod(input: unknown): string {
    if (typeof input !== 'string') {
        return 'GET';
    }

    if (input.toLowerCase() === 'submit') {
        return 'POST';
    }

    return input.toUpperCase();
}

function normalizeInvalidate(invalidate: string | string[] | undefined): string[] {
    if (!invalidate) {
        return [];
    }

    return Array.isArray(invalidate) ? invalidate : [invalidate];
}

function normalizeInputValue(value: unknown, isBooleanField: boolean): unknown {
    if (value && typeof value === 'object' && 'target' in (value as Record<string, unknown>)) {
        const target = (value as { target?: { checked?: boolean; value?: unknown } }).target;
        if (target) {
            return isBooleanField ? Boolean(target.checked) : target.value;
        }
    }

    return value;
}

function shouldSendBody(method: string, body: unknown): boolean {
    return method !== 'GET' && method !== 'HEAD' && body !== undefined;
}

function createRequestHeaders(body: unknown): Record<string, string> | undefined {
    if (body === undefined) {
        return undefined;
    }

    return {
        'content-type': 'application/json',
    };
}

async function readResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    return response.text();
}

function asRequiredString(value: unknown, message: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(message);
    }

    return value;
}

function getLoopKey(item: unknown, index: number): string {
    if (item && typeof item === 'object' && 'id' in (item as Record<string, unknown>)) {
        return String((item as Record<string, unknown>).id);
    }

    return String(index);
}

function getNodeKey(node: XmlNode, index: number): string {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
        return String(index);
    }

    const key = (node as XmlElementNode).props?.key;
    if (typeof key === 'string' || typeof key === 'number') {
        return String(key);
    }

    return String(index);
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, cloneUnknown(entryValue)]));
}

function cloneUnknown(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(cloneUnknown);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, cloneUnknown(entryValue)]));
    }

    return value;
}

function setPathValue(source: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
    if (!path) {
        return source;
    }

    const segments = path.split('.');
    const nextRoot = cloneRecord(source);
    let current: Record<string, unknown> = nextRoot;

    for (const segment of segments.slice(0, -1)) {
        const nextValue = current[segment];
        if (!nextValue || typeof nextValue !== 'object' || Array.isArray(nextValue)) {
            current[segment] = {};
        } else {
            current[segment] = cloneRecord(nextValue as Record<string, unknown>);
        }

        current = current[segment] as Record<string, unknown>;
    }

    current[segments[segments.length - 1] ?? path] = value;
    return nextRoot;
}

function getPathValue(source: unknown, path: string): unknown {
    if (!path) {
        return source;
    }

    return path.split('.').reduce<unknown>((current, segment) => {
        if (current === null || current === undefined) {
            return undefined;
        }

        if (typeof current !== 'object') {
            return undefined;
        }

        return (current as Record<string, unknown>)[segment];
    }, source);
}
