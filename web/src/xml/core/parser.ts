import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ASTNode } from '../types';

type XMLValidationFailure = {
    err?: {
        col?: number;
        line?: number;
        msg?: string;
    };
};

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
 *   <longlink><Button i18n="actions.save" /></longlink>
 *
 * Output:
 *   [
 *     {
 *       name: 'longlink',
 *       children: [
 *         { name: 'Button', params: { i18n: 'actions.save' }, children: [] }
 *       ]
 *     }
 *   ]
 */
export function parseXML(xml: string): ASTNode[] {
    // Validate first because the preserve-order parser can otherwise recover from malformed tags.
    const validationResult = XMLValidator.validate(xml) as true | XMLValidationFailure;

    if (validationResult !== true) {
        const validationError = validationResult.err;
        const location =
            validationError?.line != null && validationError?.col != null
                ? ` at line ${validationError.line}, column ${validationError.col}`
                : '';
        throw new Error(`XML is invalid${location}: ${validationError?.msg ?? 'Malformed XML'}`);
    }

    return toNodes(parser.parse(xml));
}

/**
 * Converts parser output into XML AST nodes.
 *
 * Input:
 *   toNodes({ longlink: { Button: { ':@': { '@_i18n': 'actions.save' } } } })
 *
 * Output:
 *   [
 *     {
 *       name: 'longlink',
 *       children: [
 *         { name: 'Button', params: { i18n: 'actions.save' }, children: [] }
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

    /* Visible character data is not part of the XML surface; use i18n attributes instead. */
    if (typeof input === 'string') {
        if (input.trim()) {
            throw new Error('Literal text is not supported in XML; use i18n attributes instead');
        }

        return [];
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
