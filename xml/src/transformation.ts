import { isArrayNode, isPrimitiveNode, isXmlElementNode } from './types';
import type { TransformContext, TransformVisitor, TraverseOptions, XmlElementNode, XmlNode } from './types';

function createContext(parent: XmlElementNode | null, index: number, depth: number): TransformContext {
    return { parent, index, depth };
}

export async function transformNodeTree(root: XmlNode, visitors: TransformVisitor[]): Promise<XmlNode> {
    return visitNode(root, visitors, null, 0, 0);
}

export const transformJsonTree = transformNodeTree;

async function visitNode(
    node: XmlNode,
    visitors: TransformVisitor[],
    parent: XmlElementNode | null,
    index: number,
    depth: number
): Promise<XmlNode> {
    const context = createContext(parent, index, depth);
    let currentNode = node;

    for (const visitor of visitors) {
        if (!visitor.enter) {
            continue;
        }

        const nextNode = await visitor.enter(currentNode, context);
        if (nextNode !== undefined) {
            currentNode = nextNode;
        }
    }

    if (isArrayNode(currentNode)) {
        const transformedChildren = await Promise.all(
            currentNode.map((child, childIndex) => visitNode(child, visitors, parent, childIndex, depth))
        );
        currentNode = transformedChildren;
    } else if (isXmlElementNode(currentNode) && currentNode.children !== undefined) {
        currentNode = {
            ...currentNode,
            children: await visitChildren(currentNode, visitors, depth + 1),
        };
    } else if (isPrimitiveNode(currentNode)) {
        currentNode = currentNode;
    }

    for (const visitor of visitors) {
        if (!visitor.exit) {
            continue;
        }

        const nextNode = await visitor.exit(currentNode, context);
        if (nextNode !== undefined) {
            currentNode = nextNode;
        }
    }

    return currentNode;
}

async function visitChildren(
    node: XmlElementNode,
    visitors: TransformVisitor[],
    depth: number
): Promise<XmlNode | XmlNode[]> {
    const { children } = node;
    if (children === undefined) {
        return children;
    }

    if (isArrayNode(children)) {
        return Promise.all(children.map((child, index) => visitNode(child, visitors, node, index, depth)));
    }

    return visitNode(children, visitors, node, 0, depth);
}

export function* traverseNodeTree(
    root: XmlNode,
    options: TraverseOptions = {}
): Generator<{ node: XmlNode; context: TransformContext }, void, void> {
    yield* walkNode(root, options, null, 0, 0);
}

export const traverseJsonTree = traverseNodeTree;

function* walkNode(
    node: XmlNode,
    options: TraverseOptions,
    parent: XmlElementNode | null,
    index: number,
    depth: number
): Generator<{ node: XmlNode; context: TransformContext }, void, void> {
    const context = createContext(parent, index, depth);

    if (!options.nodeTypes || !isXmlElementNode(node) || options.nodeTypes.includes(node.type)) {
        yield { node, context };
    }

    if (isArrayNode(node)) {
        for (const [childIndex, child] of node.entries()) {
            yield* walkNode(child, options, parent, childIndex, depth);
        }
        return;
    }

    if (!isXmlElementNode(node) || node.children === undefined) {
        return;
    }

    const { children } = node;
    if (isArrayNode(children)) {
        for (const [childIndex, child] of children.entries()) {
            yield* walkNode(child, options, node, childIndex, depth + 1);
        }
        return;
    }

    yield* walkNode(children, options, node, 0, depth + 1);
}
