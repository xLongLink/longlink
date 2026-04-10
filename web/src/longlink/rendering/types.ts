import type { ComponentType, ReactNode } from 'react';

export type JsonPrimitive = string | number | boolean | null;

export type JsonNode = JsonPrimitive | ComponentNode | JsonNode[];

export type JsonNodeProps = Record<string, unknown>;

export type ComponentNode = {
    type: string;
    props?: JsonNodeProps;
    children?: JsonNode | JsonNode[];
};

export type RenderContext = {
    registry?: ComponentRegistry;
};

export type TransformContext = {
    parent?: ComponentNode;
    index?: number;
    path: number[];
};

export type TransformVisitor = (node: JsonNode, context: TransformContext) => JsonNode;

export type RegistryEntry = {
    component: ComponentType<any>;
    getProps?: (node: ComponentNode, context: RenderContext) => Record<string, unknown>;
    renderChildren?: boolean;
};

export type ComponentRegistry = Record<string, RegistryEntry>;

export type RenderableComponentProps = {
    children?: ReactNode;
};

export function isComponentNode(value: unknown): value is ComponentNode {
    return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

export function isPrimitiveNode(value: unknown): value is JsonPrimitive {
    return value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export function isArrayNode(value: unknown): value is JsonNode[] {
    return Array.isArray(value);
}
