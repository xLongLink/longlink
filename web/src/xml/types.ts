/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: ASTNode | ASTNode[] | null;
};

/** XML runtime scope with lexical parent lookup. */
export type ExecutionContext = {
    parent?: ExecutionContext;
    values: Record<string, unknown>;
    [key: string]: unknown;
};

/** Standard XML component contract used by the runtime. */
export type XMLComponent<Props = Record<string, unknown>> = import('react').ComponentType<
    {
        children?: ASTNode | ASTNode[] | null | string | number | boolean;
    } & Props
>;
