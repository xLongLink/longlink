import type { XmlElementNode, XmlNode } from '../src';

function parseAttrValue(value: string): unknown {
    if (value.startsWith('{"') || value.startsWith('[')) {
        try {
            return JSON.parse(value);
        } catch {}
    }
    return value;
}

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

const response = await fetch('http://localhost:8000/');
const data = (await response.json()) as Record<string, unknown>;
const [tag, value] = Object.entries(data)[0]!;

export const xmlTree = convertElement(tag, value);
