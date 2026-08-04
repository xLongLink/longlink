import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ASTNode } from '../types';

type XMLValidationFailure = {
    err?: {
        col?: number;
        line?: number;
        msg?: string;
    };
};

const UNSUPPORTED_XML_MARKUP_PATTERN = /<!\s*(?:DOCTYPE|ENTITY)\b|<!\[CDATA\[/i;

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
    // Reject XML constructs outside the supported subset.
    if (UNSUPPORTED_XML_MARKUP_PATTERN.test(xml)) {
        throw new Error('XML DOCTYPE, ENTITY, and CDATA constructs are not supported');
    }

    // Validate first because the preserve-order parser can otherwise recover from malformed tags.
    const validationResult = XMLValidator.validate(xml) as true | XMLValidationFailure;

    // Surface parser validation errors with location details.
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
    // Flatten preserve-order arrays into sibling nodes.
    if (Array.isArray(input)) {
        return input.flatMap((item) => toNodes(item));
    }

    // Treat empty parser output as no nodes.
    if (!input) return [];

    // Ignore whitespace-only text nodes.
    if (typeof input === 'string') {
        // Reject visible literal text.
        if (input.trim()) {
            throw new Error('Literal text is not supported in XML; use i18n attributes instead');
        }

        return [];
    }

    // Ignore unsupported primitive parser values.
    if (typeof input !== 'object') return [];

    const record = input as Record<string, unknown>;
    const attributes = collectParams(record[':@']);

    // Preserve sibling order while stripping parser metadata.
    return Object.entries(record).flatMap(([key, value]) => {
        // Skip attributes and parser metadata.
        if (key === ':@' || key.startsWith('?') || key.startsWith('!')) {
            return [];
        }

        // Reprocess text wrappers through the same rules.
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
    // Ignore malformed attribute containers.
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {};
    }

    const record = input as Record<string, unknown>;

    // Unwrap parser attribute metadata.
    if (':@' in record) {
        return collectParams(record[':@']);
    }

    const params: Record<string, string> = {};

    // Copy string attributes without parser prefixes.
    for (const [key, entry] of Object.entries(record)) {
        // Keep only literal string attributes.
        if (typeof entry === 'string') {
            params[key.replace(/^@_/, '')] = entry;
        }
    }

    return params;
}
