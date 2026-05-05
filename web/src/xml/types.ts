import type { ComponentType } from 'react';

/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: ASTNode[];
    value?: string;
};

/** Flat XML value context used for attribute evaluation. */
export type ExecutionContext = Record<string, unknown>;

/** Runtime options that configure XML rendering without entering expression state. */
export type RuntimeOptions = {
    baseUrl?: string;
};

/** Setter context used by $-bound XML attributes and state primitives. */
export type SetterContext = Record<string, (value: unknown) => void>;

/** A React component that can be registered and rendered from XML. */
export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

/** A node or array of nodes that can be rendered by renderNode. */
export type RenderableASTNode = ASTNode | ASTNode[] | null | undefined;

/** State provided by RuntimeProvider to the render tree. */
export type RuntimeState = {
    ctx: ExecutionContext;
    options?: RuntimeOptions;
    setters?: SetterContext;
    props: Record<string, unknown>;
    children?: RenderableASTNode;
};

/** Standard XML component contract used by the runtime. */
export type XmlComponentProps = {
    props: Record<string, unknown>;
    children?: RenderableASTNode;
};

/** XML component type with the runtime contract. */
export type XmlRegistryComponent<Props = Record<string, unknown>> = ComponentType<Props & XmlComponentProps>;
