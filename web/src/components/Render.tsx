import { isPlainObject } from 'es-toolkit/predicate';

import { registry } from '@/lib/registry';
import { renderNode, type ComponentNode, type JsonNode, isComponentNode, isPrimitiveNode } from '@/rendering';

type RenderNodeSchema = unknown;

const ROOT_COMPONENT_NAMES = ['Page', 'page'] as const;
const INTEGER_PATTERN = /^-?\d+$/;
const FLOAT_PATTERN = /^-?\d+\.\d+$/;

function coerceXmlScalar(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    const lowered = trimmed.toLowerCase();

    if (lowered === 'true') {
        return true;
    }

    if (lowered === 'false') {
        return false;
    }

    if (lowered === 'null' || lowered === 'none') {
        return null;
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    if (INTEGER_PATTERN.test(trimmed)) {
        return Number.parseInt(trimmed, 10);
    }

    if (FLOAT_PATTERN.test(trimmed)) {
        return Number.parseFloat(trimmed);
    }

    return value;
}

function toNodeArray<T>(value: T | T[]) {
    return Array.isArray(value) ? value : [value];
}

function normalizeXmlElement(name: string, value: unknown): ComponentNode {
    if (value == null || value === '') {
        return {
            type: name,
            props: {},
            children: [],
        };
    }

    if (!isPlainObject(value)) {
        return {
            type: name,
            props: {},
            children: [coerceXmlScalar(value) as JsonNode],
        };
    }

    const props: Record<string, unknown> = {};
    const children: JsonNode[] = [];

    for (const [key, item] of Object.entries(value)) {
        if (key === '#text') {
            const text = typeof item === 'string' ? item.trim() : item;
            if (text !== '' && text != null) {
                children.push(coerceXmlScalar(text) as JsonNode);
            }
            continue;
        }

        if (key.startsWith('@')) {
            props[key.slice(1)] = coerceXmlScalar(item);
            continue;
        }

        for (const childItem of toNodeArray(item)) {
            children.push(normalizeXmlElement(key, childItem));
        }
    }

    return {
        type: name,
        props,
        children,
    };
}

export function normalizeRenderRoots(schema: unknown): JsonNode[] {
    if (schema == null) {
        return [];
    }

    if (Array.isArray(schema)) {
        return schema as JsonNode[];
    }

    if (isComponentNode(schema) || isPrimitiveNode(schema)) {
        return [schema as JsonNode];
    }

    if (!isPlainObject(schema)) {
        return [];
    }

    for (const rootName of ROOT_COMPONENT_NAMES) {
        if (rootName in schema) {
            return [normalizeXmlElement(rootName, schema[rootName])];
        }
    }

    return [];
}

export type { RenderNodeSchema };

type RenderProps = {
    node: unknown;
};

export function renderLonglinkNode(node: unknown) {
    return renderNode(normalizeRenderRoots(node), registry);
}

export function Render({ node }: RenderProps) {
    return renderLonglinkNode(node);
}

export default Render;
