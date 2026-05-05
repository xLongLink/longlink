import type { ComponentType } from 'react';

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
    baseUrl?: string;
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

/** Props accepted by XML buttons for actions and navigation. */
export type ActionProps = {
    action?: string;
    method?: string;
    body?: unknown;
    payload?: unknown;
    invalidate?: string | string[];
};
