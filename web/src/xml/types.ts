import type { ComponentType, MouseEvent } from 'react';

/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: ASTNode[];
    value?: string;
};

/**
 * Runtime context threaded through the render tree.
 *
 * - `state`   — reactive state variables keyed by id; each entry is a
 *               `[currentValue, setter]` tuple (mirrors React's useState).
 * - `queries` — data fetched by `<Query>` nodes, keyed by id.
 * - `scope`   — locally scoped variables introduced by `<For>` and similar
 *               primitives; highest-priority during expression evaluation.
 */
export type ExecutionContext = {
    state: Record<string, [any, Function]>;
    queries: Record<string, any>;
    scope: Record<string, any>;
};

/** A React component that can be registered and rendered from XML. */
export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

/** A map of component name → RegistryComponent used to resolve XML tags. */
export type RegistryShape = Record<string, RegistryComponent<any>>;

/** Raw output shape from fast-xml-parser when preserveOrder is enabled. */
export type PreserveOrderNode = Record<string, any>;

/** A node or array of nodes that can be rendered by renderNode. */
export type RenderableASTNode = ASTNode | ASTNode[] | null | undefined;

/** State provided by RuntimeProvider to the render tree. */
export type RuntimeState = {
    node: ASTNode;
    ctx: ExecutionContext;
    registry: RegistryShape;
};

/** Handler for action component clicks. */
export type ActionHandler = (event: MouseEvent<any>) => Promise<void>;

/** Props accepted by the action HOC. */
export type ActionProps = {
    path?: string;
    method?: string;
    body?: unknown;
    invalidate?: string | string[];
};

/** Props injected by the action HOC into the wrapped component. */
export type ActionComponentProps = {
    action: ActionHandler;
    pending: boolean;
};
