import { Fragment, createElement, type ReactNode } from 'react';
import {
    isArrayNode,
    isComponentNode,
    isPrimitiveNode,
    type ComponentNode,
    type ComponentRegistry,
    type JsonNode,
    type RenderContext,
} from './types';

function renderChildren(
    children: JsonNode | JsonNode[] | undefined,
    registry: ComponentRegistry,
    context: RenderContext
): ReactNode {
    if (children === undefined) {
        return undefined;
    }

    return renderNode(children, registry, context);
}

function renderComponentNode(node: ComponentNode, registry: ComponentRegistry, context: RenderContext): ReactNode {
    const entry = registry[node.type];

    if (!entry) {
        console.warn(`Unknown LongLink component type: ${node.type}`);
        return null;
    }

    const { component, getProps, renderChildren: shouldRenderChildren = true } = entry;
    const key = node.props?.key ?? node.props?.id;
    const props = {
        ...node.props,
        ...getProps?.(node, context),
    };

    const renderedChildren = shouldRenderChildren ? renderChildren(node.children, registry, context) : undefined;

    return createElement(component, key === undefined ? props : { ...props, key }, renderedChildren);
}

export function renderNode(node: JsonNode, registry: ComponentRegistry, context: RenderContext = {}): ReactNode {
    if (isPrimitiveNode(node)) {
        return node;
    }

    if (isArrayNode(node)) {
        return node.map((child, index) => (
            <Fragment key={isComponentNode(child) ? String(child.props?.key ?? child.props?.id ?? index) : index}>
                {renderNode(child, registry, context)}
            </Fragment>
        ));
    }

    return renderComponentNode(node, registry, context);
}
