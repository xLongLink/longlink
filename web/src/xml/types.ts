/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: ASTNode[];
};

/** Value shape accepted by XML form controls. */
export type XmlBindableValue = string | number | boolean | Record<string, unknown>;

/** XML runtime scope with lexical parent lookup. */
export type ExecutionContext = {
    parent?: ExecutionContext;
    setups: Record<string, () => Promise<void> | void>;
    invalidate: (ids: string | string[]) => Promise<void>;
    values: Record<string, unknown>;
    [key: string]: unknown;
};
