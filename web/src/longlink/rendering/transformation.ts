import {
    isArrayNode,
    isComponentNode,
    type ComponentNode,
    type JsonNode,
    type TransformContext,
    type TransformVisitor,
} from './types';

function visitNode(node: JsonNode, visitor: TransformVisitor, context: TransformContext): JsonNode {
    if (isArrayNode(node)) {
        const nextNode = node.map((child, index) =>
            visitNode(child, visitor, {
                parent: context.parent,
                index,
                path: [...context.path, index],
            })
        );

        return visitor(nextNode, context);
    }

    if (isComponentNode(node)) {
        const children = node.children;
        const nextNode: ComponentNode = {
            ...node,
            props: node.props ? { ...node.props } : undefined,
            children:
                children === undefined
                    ? undefined
                    : visitNode(children, visitor, {
                          parent: node,
                          path: context.path,
                      }),
        };

        return visitor(nextNode, context);
    }

    return visitor(node, context);
}

export function transformJsonTree(node: JsonNode, visitor: TransformVisitor): JsonNode {
    return visitNode(node, visitor, { path: [] });
}

export function traverseJsonTree(node: JsonNode, visitor: (node: JsonNode, context: TransformContext) => void) {
    transformJsonTree(node, (currentNode, context) => {
        visitor(currentNode, context);
        return currentNode;
    });
}

export type TraverseOptions = {
    includePrimitives?: boolean;
};
