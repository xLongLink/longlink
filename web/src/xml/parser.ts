import { XMLParser } from 'fast-xml-parser';
import type { ASTNode } from '@xml/types';

const parser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: ':@',
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
});

/**
 * Parses an XML string into a flat AST structure.
 *
 * Input:
 *   <Page>Hello, {user.name}<Button>Save</Button></Page>
 *
 * Output:
 *   [
 *     {
 *       name: 'Page',
 *       children: [
 *         { name: 'Text', params: { value: 'Hello, {user.name}' } },
 *         {
 *           name: 'Button',
 *           children: [
 *             { name: 'Text', params: { value: 'Save' } }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 */
export function parseXML(xml: string): ASTNode[] {
    return toNodes(parser.parse(xml));
}

/**
 * Converts parser output into XML AST nodes.
 *
 * Input:
 *   toNodes({ Page: { '#text': 'Hello, {user.name}', Button: { '#text': 'Save' } } })
 *
 * Output:
 *   [
 *     {
 *       name: 'Page',
 *       children: [
 *         { name: 'Text', params: { value: 'Hello, {user.name}' } },
 *         {
 *           name: 'Button',
 *           children: [
 *             { name: 'Text', params: { value: 'Save' } }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 */
function toNodes(input: unknown, tagName?: string): ASTNode[] {
    /* Arrays are flattened so repeated sibling tags become sibling AST nodes. */
    if (Array.isArray(input)) {
        return input.flatMap((item) => toNodes(item, tagName));
    }

    if (tagName) {
        const params: Record<string, string> = {};
        const children: ASTNode[] = [];

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            const attributes = (input as Record<string, unknown>)[':@'];

            /* Parser-grouped attributes keep string children distinct from string params. */
            if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
                for (const [key, entry] of Object.entries(attributes)) {
                    if (typeof entry === 'string') {
                        params[key.replace(/^@_/, '')] = entry;
                    }
                }
            }

            /* Element body entries become text nodes or nested XML elements. */
            for (const [key, entry] of Object.entries(input as Record<string, unknown>)) {
                if (key === ':@') {
                    continue;
                } else if (key === '#text') {
                    children.push(...toNodes(entry));
                } else {
                    children.push(...toNodes(entry, key));
                }
            }
        }

        return [
            {
                name: tagName,
                ...(Object.keys(params).length > 0 && { params }),
                ...(children.length > 0 && { children }),
            },
        ];
    }

    if (!input) return [];

    /* Primitive parser values become text nodes when they contain visible content. */
    if (typeof input === 'string') {
        return input.trim() ? [{ name: 'Text', params: { value: input } }] : [];
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
