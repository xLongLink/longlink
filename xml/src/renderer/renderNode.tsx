import { Fragment, createElement, type ReactNode } from 'react';
import { evaluate } from '../runtime/evaluate';
import { interpolate } from '../runtime/interpolate';
import type { ASTNode, ExecutionContext, PrimitiveComponent, RegistryShape } from '../types';

type RenderableASTNode = ASTNode | ASTNode[] | null | undefined;

function isPrimitiveComponent(component: RegistryShape[string]): component is PrimitiveComponent {
    return '$$reactxmlPrimitive' in component && component.$$reactxmlPrimitive === true;
}

function resolveParamValue(value: string, ctx: ExecutionContext): unknown {
    const expressionMatch = value.match(/^\{([^}]+)\}$/);
    const expression = expressionMatch?.[1];

    if (expression) {
        return evaluate(expression, ctx);
    }

    return interpolate(value, ctx);
}

function resolveParams(params: ASTNode['params'], ctx: ExecutionContext): Record<string, unknown> {
    if (!params) return {};

    return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, resolveParamValue(value, ctx)]));
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

    if (isPrimitiveComponent(component)) {
        return createElement(component, { node, registry, ctx });
    }

    const children = node.children?.map((child, index) => (
        <Fragment key={index}>{renderNode(child, registry, ctx)}</Fragment>
    ));

    return createElement(component, resolveParams(node.params, ctx), children);
}
