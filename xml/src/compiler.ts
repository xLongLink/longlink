import { XMLParser } from 'fast-xml-parser';
import type { ASTNode } from './types';


const TEXT_NODE_NAME = '#text';
const ATTRIBUTES_NODE_NAME = ':@';

/**
 * Shared parser instance configured to produce a preserve-order array of nodes.
 * Attribute names are kept verbatim (no prefix), values are never auto-cast, and
 * XML declarations are dropped. The `set:target` namespace-like syntax is handled
 * transparently because fast-xml-parser does not normalise namespace prefixes in
 * attribute names with this configuration.
 */
const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: TEXT_NODE_NAME,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    ignoreDeclaration: true,
});

type PreserveOrderNode = Record<string, any>;


/**
 * Parses an XML string into an array of ASTNodes.
 *
 * The returned array represents the top-level children of the document.
 * Whitespace-only text nodes and XML declarations are silently dropped.
 */
export function xmlToAST(xml: string): ASTNode[] {
    const parsed = parser.parse(xml) as PreserveOrderNode[];

    const children: ASTNode[] = [];

    for (const entry of parsed) {
        const node = convertNode(entry);
        if (node) children.push(node);
    }

    return children;
}


/**
 * Converts a single preserve-order parser entry into an ASTNode.
 *
 * Returns null for:
 *   - Entries with no recognisable tag name
 *   - Processing instructions (`?...`) and DOCTYPE declarations (`!...`)
 *   - Text nodes that are empty or contain only whitespace
 *
 * Attribute values are always strings; non-string values (e.g. booleans
 * produced by fast-xml-parser) are discarded.
 */
function convertNode(entry: PreserveOrderNode): ASTNode | null {
    const nodeName = Object.keys(entry).find((key) => key !== ATTRIBUTES_NODE_NAME);
    if (!nodeName) return null;

    if (nodeName.startsWith('!') || nodeName.startsWith('?')) {
        return null;
    }

    if (nodeName === TEXT_NODE_NAME) {
        const text = entry[TEXT_NODE_NAME];

        if (typeof text === 'string' && text.trim() !== '') {
            return { name: 'text', value: text };
        }

        return null;
    }

    const rawAttributes = entry[ATTRIBUTES_NODE_NAME];
    const params: Record<string, string> = {};
    if (rawAttributes && typeof rawAttributes === 'object') {
        for (const [key, value] of Object.entries(rawAttributes)) {
            if (typeof value === 'string') {
                params[key] = value;
            }
        }
    }

    const childrenRaw = entry[nodeName];
    const children: ASTNode[] = [];

    if (Array.isArray(childrenRaw)) {
        for (const child of childrenRaw) {
            const converted = convertNode(child as PreserveOrderNode);
            if (converted) children.push(converted);
        }
    }

    return {
        name: nodeName,
        ...(Object.keys(params).length > 0 && { params }),
        ...(children.length > 0 && { children }),
    };
}
