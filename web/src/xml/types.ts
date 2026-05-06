import type { ComponentType } from 'react';

/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: RenderableASTNode;
};

/** XML runtime scope with lexical parent lookup. */
export type ExecutionContext = {
    parent?: ExecutionContext;
    values: Record<string, unknown>;
};

/** A React component that can be registered and rendered from XML. */
export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

/** A node or array of nodes that can be rendered by renderXml. */
export type RenderableASTNode = ASTNode | ASTNode[] | null | undefined;

/** Standard XML component contract used by the runtime. */
export type XmlComponentProps = {
    props: Record<string, string>;
    children?: RenderableASTNode;
};

/** XML component type with the runtime contract. */
export type XmlRegistryComponent<Props = Record<string, unknown>> = ComponentType<Props & XmlComponentProps>;
