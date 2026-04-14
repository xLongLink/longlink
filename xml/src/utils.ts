import type { XmlElementNode, XmlNode, XmlPrimitive } from './types';

export const FRAGMENT = 'Fragment';

/** Returns true if the node is an element node (has a `type` string). */
export function isXmlElementNode(node: XmlNode): node is XmlElementNode {
    return (
        node !== null &&
        node !== undefined &&
        typeof node === 'object' &&
        !Array.isArray(node) &&
        typeof (node as XmlElementNode).type === 'string'
    );
}

/** Returns true if the node is a primitive value (string, number, boolean, null, or undefined). */
export function isPrimitiveNode(node: XmlNode): node is XmlPrimitive {
    return (
        node === null ||
        node === undefined ||
        typeof node === 'string' ||
        typeof node === 'number' ||
        typeof node === 'boolean'
    );
}

/** Returns true if the node is an array of child nodes. */
export function isArrayNode(node: XmlNode): node is XmlNode[] {
    return Array.isArray(node);
}

/** Creates an XmlElementNode with optional props and children. */
export function createElementNode(
    type: string,
    props?: Record<string, unknown>,
    children?: XmlNode | XmlNode[]
): XmlElementNode {
    return {
        type,
        ...(props ? { props } : {}),
        ...(children !== undefined ? { children } : {}),
    };
}

/** Creates a Fragment element node that wraps children without adding a DOM element. */
export function createFragment(children: XmlNode | XmlNode[], key?: string): XmlElementNode {
    return createElementNode(FRAGMENT, key ? { key } : undefined, children);
}
