import { compileAttribute } from '../expressions';
import type { ASTNode, ASTProps } from '../types';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

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
    const validationResult = XMLValidator.validate(xml);

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

    // Compile visible text into private AST nodes so XML elements can use natural text children.
    if (typeof input === 'string') {
        const value = input.trim();

        return value ? [{ name: '$text', params: { value: compileAttribute(value) }, children: [] }] : [];
    }

    // Treat empty or unsupported parser output as no nodes.
    if (!input || typeof input !== 'object') return [];

    const record = input as Record<string, unknown>;
    const params = collectParams(record[':@']);
    validateParams(params);

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
                params,
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

    const record = input as Record<string, string>;

    const params: ASTProps = {};

    // Copy attributes without parser prefixes.
    for (const [key, entry] of Object.entries(record)) {
        // Compile string attributes without resolving runtime values.
        const name = key.slice(2);

        // Table fields are literal paths rather than runtime values.
        params[name] = name === 'field' ? { kind: 'text', value: entry } : compileAttribute(entry);
    }

    return params;
}

/** Rejects XML attributes that would let consumers control adapter behavior or styling. */
function validateParams(params: ASTProps): void {
    for (const name of Object.keys(params)) {
        const lowerName = name.toLowerCase();

        if (lowerName === 'classname' || lowerName === 'style' || lowerName === 'xstyle') {
            throw new Error(`${name} is not supported in XML`);
        }

        if (lowerName.startsWith('on')) {
            throw new Error(`Event handler attribute "${name}" is not supported in XML`);
        }
    }
}
