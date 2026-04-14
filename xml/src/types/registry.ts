import type { ComponentType } from 'react';
import type { ASTNode } from './ast';
import type { ExecutionContext } from './executionContext';

export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

export type PrimitiveProps = {
    node: ASTNode;
    ctx: ExecutionContext;
    registry: RegistryShape;
};

export type PrimitiveComponent = ComponentType<PrimitiveProps> & {
    $$reactxmlPrimitive: true;
};

export type RegistryEntry = RegistryComponent<any> | PrimitiveComponent;

export type RegistryShape = Record<string, RegistryEntry>;
