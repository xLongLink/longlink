import type { ComponentType } from 'react';

export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: ASTNode[];
    value?: string;
};

export type ExecutionContext = {
    state: Record<string, [any, Function]>;
    queries: Record<string, any>;
    scope: Record<string, any>;
};

export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

export type RegistryShape = Record<string, RegistryComponent<any>>;
