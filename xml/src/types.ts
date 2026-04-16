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
};


/** A React component that can be registered and rendered from XML. */
export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

/** A map of component name → RegistryComponent used to resolve XML tags. */
export type RegistryShape = Record<string, RegistryComponent<any>>;
