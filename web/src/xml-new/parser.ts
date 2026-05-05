import { XMLParser } from 'fast-xml-parser';
import type { XmlNode } from './types';

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
});

/* Parses an XML string into an array of XmlNode objects. */
export function parseXml(xml: string): XmlNode[] {
    const parsed = parser.parse(xml);

    function toNodes(input: any, tagName?: string): XmlNode[] {
        if (!input) return [];

        // Text node (string)
        if (typeof input === 'string') {
            return input.trim() ? [{ tagName: 'Text', attributes: { value: input }, children: [] }] : [];
        }

        // Array of nodes
        if (Array.isArray(input)) {
            return input.flatMap((item) => toNodes(item, tagName));
        }

        // Object node
        return Object.entries(input).flatMap(([key, value]) => {
            // Skip declarations/comments
            if (key.startsWith('?') || key.startsWith('!')) return [];

            // Handle explicit text node
            if (key === '#text') {
                return toNodes(value);
            }

            // If we already have a tagName (nested case), treat this as element content
            if (tagName) {
                return [buildElement(tagName, input)];
            }

            // Root-level element
            return toNodes(value, key);
        });
    }

    function buildElement(tagName: string, value: any): XmlNode {
        const attributes: Record<string, string> = {};
        const children: XmlNode[] = [];

        // If the value is a primitive, treat it as text content.
        if (typeof value !== 'object' || value === null) {
            return {
                tagName,
                attributes,
                children: toNodes(value),
            };
        }

        // Process attributes and child nodes
        for (const [key, entry] of Object.entries(value)) {
            if (key === '#text') {
                children.push(...toNodes(entry));
            } else if (typeof entry === 'string') {
                attributes[key] = entry;
            } else {
                children.push(...toNodes(entry, key));
            }
        }

        return { tagName, attributes, children };
    }

    return toNodes(parsed);
}
