import { Fragment, createElement, type ReactNode } from 'react';
import { interpolate } from '../runtime/interpolate';
import { resolveValue } from '../runtime/resolveValue';
import { RuntimeChildren, RuntimeProvider } from '../runtime/useRuntime';
import type { ASTNode, ExecutionContext, RegistryShape } from '../types';

type RenderableASTNode = ASTNode | ASTNode[] | null | undefined;

function resolveParams(params: ASTNode['params'], ctx: ExecutionContext): Record<string, unknown> {
    if (!params) return {};

    return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, resolveValue(value, ctx)]));
}

export function renderNode(
    node: RenderableASTNode,
    registry: RegistryShape,
    ctx: ExecutionContext,
    _runtime?: unknown
): ReactNode {
    if (!node) return null;

    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, registry, ctx)}</Fragment>);
    }

    if (node.name === 'text') {
        return node.value ? interpolate(node.value, ctx) : null;
    }

    const component = registry[node.name];

    if (!component) {
        throw new Error(`Unknown component "${node.name}"`);
    }

    return (
        <RuntimeProvider value={{ node, registry, ctx }}>
            {createElement(component, resolveParams(node.params, ctx), node.children ? <RuntimeChildren /> : undefined)}
        </RuntimeProvider>
    );
}
