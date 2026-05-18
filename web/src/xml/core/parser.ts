import type { ASTNode } from '@xml/types';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: ':@',
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    preserveOrder: true,
});

/**
 * Parses an XML string into a flat AST structure.
 *
 * Input:
 *   <longlink>Hello, ${user.name}<Button>Save</Button></longlink>
 *
 * Output:
 *   [
 *     {
 *       name: 'longlink',
 *       children: [
 *         { name: 'Text', params: { value: 'Hello, ${user.name}' } },
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
 *   toNodes({ longlink: { '#text': 'Hello, ${user.name}', Button: { '#text': 'Save' } } })
 *
 * Output:
 *   [
 *     {
 *       name: 'longlink',
 *       children: [
 *         { name: 'Text', params: { value: 'Hello, ${user.name}' } },
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
function toNodes(input: unknown): ASTNode[] {
    /* Arrays are flattened so preserve-order parser output becomes a normal sibling AST list. */
    if (Array.isArray(input)) {
        return input.flatMap((item) => toNodes(item));
    }

    if (!input) return [];

    /* Primitive parser values become text nodes when they contain visible content. */
    if (typeof input === 'string') {
        return input.trim() ? [{ name: 'Text', params: { value: input } }] : [];
    }

    if (typeof input !== 'object') return [];

    const record = input as Record<string, unknown>;
    const attributes = collectParams(record[':@']);

    /* Preserve the source order of sibling tags while stripping parser-only metadata. */
    return Object.entries(record).flatMap(([key, value]) => {
        if (key === ':@' || key.startsWith('?') || key.startsWith('!')) {
            return [];
        }

        if (key === '#text') {
            return toNodes(value);
        }

        const children = toNodes(value);

        return [
            {
                name: key,
                ...(Object.keys(attributes).length > 0 && { params: attributes }),
                children,
            },
        ];
    });
}

/** Collects parser attributes into plain XML params. */
function collectParams(input: unknown): Record<string, string> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {};
    }

    const record = input as Record<string, unknown>;

    /* Preserve the wrapper shape emitted by the preserve-order parser. */
    if (':@' in record) {
        return collectParams(record[':@']);
    }

    const params: Record<string, string> = {};

    for (const [key, entry] of Object.entries(record)) {
        if (typeof entry === 'string') {
            params[key.replace(/^@_/, '')] = entry;
        }
    }

    return params;
}
