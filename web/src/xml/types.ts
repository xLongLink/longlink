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
    [key: string]: unknown;
};

/** A node or array of nodes that can be rendered by renderNode. */
export type RenderableASTNode = ASTNode | ASTNode[] | null;

/** Standard XML component contract used by the runtime. */
export type XMLComponent<Props = Record<string, unknown>> = import('react').ComponentType<
    {
        children?: RenderableASTNode | string | number | boolean;
    } & Props
>;
