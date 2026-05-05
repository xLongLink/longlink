import { XMLParser } from 'fast-xml-parser';
import type { ASTNode } from './types';

/**
 * Shared parser instance configured to keep XML values as strings.
 */
const parser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: ':@',
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
});

/** Parses an XML string into an array of ASTNodes. */
export function xmlToAST(xml: string): ASTNode[] {
    return toNodes(parser.parse(xml));
}

/** Converts parser output into XML AST nodes. */
function toNodes(input: unknown, tagName?: string): ASTNode[] {
    /* Arrays are flattened so repeated sibling tags become sibling AST nodes. */
    if (Array.isArray(input)) {
        return input.flatMap((item) => toNodes(item, tagName));
    }

    if (tagName) {
        return [buildElement(tagName, input)];
    }

    if (!input) return [];

    /* Primitive parser values become text nodes when they contain visible content. */
    if (typeof input === 'string') {
        return input.trim() ? [{ name: 'Text', params: { text: input } }] : [];
    }

    if (typeof input !== 'object') return [];

    /* Root objects are expanded into their top-level XML elements. */
    return Object.entries(input).flatMap(([key, value]) => {
        if (key.startsWith('?') || key.startsWith('!')) return [];

        if (key === '#text') {
            return toNodes(value);
        }

        return toNodes(value, key);
    });
}

/** Builds one AST element from a parsed XML object. */
function buildElement(tagName: string, value: unknown): ASTNode {
    const params: Record<string, string> = {};
    const children = toChildNodes(value);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const attributes = (value as Record<string, unknown>)[':@'];

        /* Parser-grouped attributes keep string children distinct from string params. */
        if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
            for (const [key, entry] of Object.entries(attributes)) {
                if (typeof entry === 'string') {
                    params[key.replace(/^@_/, '')] = entry;
                }
            }
        }
    }

    return {
        name: tagName,
        ...(Object.keys(params).length > 0 && { params }),
        ...(children.length > 0 && { children }),
    };
}

/** Converts an element body into child AST nodes. */
function toChildNodes(value: unknown): ASTNode[] {
    if (typeof value === 'string') {
        return value.trim() ? [{ name: 'Text', params: { text: value } }] : [];
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];

    const children: ASTNode[] = [];

    /* Element body entries become text nodes or nested XML elements. */
    for (const [key, entry] of Object.entries(value)) {
        if (key === ':@') {
            continue;
        } else if (key === '#text') {
            children.push(...toNodes(entry));
        } else {
            children.push(...toNodes(entry, key));
        }
    }

    return children;
}
