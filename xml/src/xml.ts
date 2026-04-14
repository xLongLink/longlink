import { XMLParser } from 'fast-xml-parser';
import type { XmlElementNode, XmlNode } from './types';

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    textNodeName: '#text',
    parseAttributeValue: false,
    trimValues: true,
    processEntities: true,
});

/**
 * Tries to parse a JSON-encoded attribute string (objects or arrays).
 * Falls back to returning the raw string if parsing fails or the value doesn't look like JSON.
 */
function parseAttrValue(value: string): unknown {
    if (value.startsWith('{"') || value.startsWith('[')) {
        try {
            return JSON.parse(value);
        } catch {}
    }
    return value;
}

/**
 * Recursively converts a single fast-xml-parser-formatted JSON entry into an XmlElementNode.
 *
 * fast-xml-parser encodes XML as follows:
 * - Element attributes are prefixed with `@` (e.g. `@id`)
 * - Inline text content of mixed elements is stored under the `#text` key
 * - Text-only elements have their value as a plain string
 * - Repeated sibling elements with the same tag are collapsed into an array
 * - Self-closing elements (no content, no attributes) are represented as an empty string
 */
function convertElement(tag: string, value: unknown): XmlElementNode {
    const props: Record<string, unknown> = {};
    const children: XmlNode[] = [];

    if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
            const text = value.trim();
            if (text) children.push(text);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            const obj = value as Record<string, unknown>;
            for (const [k, v] of Object.entries(obj)) {
                if (k.startsWith('@')) {
                    props[k.slice(1)] = parseAttrValue(v as string);
                } else if (k === '#text') {
                    const text = String(v).trim();
                    if (text) children.push(text);
                } else if (Array.isArray(v)) {
                    for (const child of v as unknown[]) {
                        children.push(convertElement(k, child));
                    }
                } else {
                    children.push(convertElement(k, v));
                }
            }
        }
    }

    return {
        type: tag,
        ...(Object.keys(props).length ? { props } : {}),
        ...(children.length === 1 ? { children: children[0] } : children.length > 1 ? { children } : {}),
    };
}

/**
 * Parses an XML string into an XmlElementNode tree using fast-xml-parser.
 *
 * The XML declaration (`<?xml ...?>`) is automatically ignored.
 * The root element of the document becomes the root node of the returned tree.
 *
 * @example
 * const response = await fetch('http://localhost:8000/');
 * const xml = await response.text();
 * const tree = fromXml(xml);
 */
export function fromXml(xml: string): XmlElementNode {
    const data = parser.parse(xml) as Record<string, unknown>;
    // Skip processing-instruction keys (e.g. "?xml" from the XML declaration)
    const [tag, value] = Object.entries(data).find(([k]) => !k.startsWith('?'))!;
    return convertElement(tag, value);
}
