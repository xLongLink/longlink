import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ASTNode, ASTProps } from '../types';
import { compileAttribute } from '../expressions';

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

/** Parses an XML string into a flat AST structure. */
export function parseXML(xml: string): ASTNode[] {
    // Reject XML constructs outside the supported subset.
    if (UNSUPPORTED_XML_MARKUP_PATTERN.test(xml)) {
        throw new Error('XML DOCTYPE, ENTITY, and CDATA constructs are not supported');
    }

    // Validate first because the preserve-order parser can otherwise recover from malformed tags.
    const validationResult = XMLValidator.validate(xml) as
        | true
        | { err?: { col?: number; line?: number; msg?: string } };

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

/** Converts parser output into XML AST nodes. */
function toNodes(input: unknown): ASTNode[] {
    // Flatten preserve-order arrays into sibling nodes.
    if (Array.isArray(input)) {
        return input.flatMap((item) => toNodes(item));
    }

    // Treat empty parser output as no nodes.
    if (!input) return [];

    // Compile visible text into the existing Text adapter so XML elements can use natural text children.
    if (typeof input === 'string') {
        const value = input.trim();

        return value ? [{ name: 'Text', params: { value: compileAttribute(value) }, children: [] }] : [];
    }

    // Ignore unsupported primitive parser values.
    if (typeof input !== 'object') return [];

    const record = input as Record<string, unknown>;
    const attributes = collectParams(record[':@']);

    // Preserve sibling order while stripping parser metadata.
    return Object.entries(record).flatMap(([key, value]) => {
        // Skip attributes and parser metadata.
        if (key === ':@' || key.startsWith('?')) {
            return [];
        }

        // Reprocess text wrappers through the same rules.
        if (key === '#text') {
            return toNodes(value);
        }

        return [
            {
                name: key,
                params: attributes,
                children: toNodes(value),
            },
        ];
    });
}

/** Collects parser attributes into plain XML params. */
function collectParams(input: unknown): ASTProps {
    // Ignore malformed attribute containers.
    if (!input || typeof input !== 'object') {
        return {};
    }

    const record = input as Record<string, unknown>;

    const params: ASTProps = {};

    // Copy string attributes without parser prefixes.
    for (const [key, entry] of Object.entries(record)) {
        // Compile string attributes without resolving runtime values.
        if (typeof entry === 'string') {
            const name = key.replace(/^@_/, '');
            params[name] = compileAttribute(entry, name === 'field');
        }
    }

    return params;
}
