export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: ASTNode[];
    value?: string;
};
