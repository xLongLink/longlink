import { evaluate } from '../expressions';
import type { ASTNode, ASTProps, Scope } from '../types';

const XML_SPACING = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const;

export type XmlSpacing = (typeof XML_SPACING)[number];

/** Reads a compiled XML prop without coercion. */
export function readXmlProp(props: ASTProps, name: string): ASTProps[string] | undefined {
    const value = props[name];

    return value == null || (value.kind === 'text' && value.value === '') ? undefined : value;
}

/** Resolves a required XML string prop and throws a tag-specific error when missing. */
export function requireXmlString(props: ASTProps, name: string, ctx: Scope, componentName: string): string {
    // Required string attributes must be present before evaluation.
    const attribute = readXmlProp(props, name);
    if (attribute == null) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    // Normalize unsupported values to an invalid empty string.
    const value = evaluate(attribute, ctx);
    const stringValue = value == null || typeof value === 'object' || typeof value === 'function' ? '' : String(value);

    // Whitespace-only values should fail like missing values.
    if (!stringValue.trim()) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    return stringValue;
}

/** Resolves a string XML prop. */
export function resolveXmlString(props: ASTProps, name: string, ctx: Scope): string | undefined {
    const attribute = readXmlProp(props, name);
    if (attribute == null) return undefined;

    const value = evaluate(attribute, ctx);

    return value == null ? undefined : String(value);
}

/** Resolves a boolean XML prop. */
export function resolveXmlBoolean(props: ASTProps, name: string, ctx: Scope): boolean | undefined {
    // Missing attributes remain undefined.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return undefined;

    const value = evaluate(attribute, ctx);

    // Preserve explicit false values instead of coercing them through truthiness.
    if (value === false || value === 'false') return false;

    // Nullish or empty values remain undefined.
    if (value == null || value === '') return undefined;

    return Boolean(value);
}

/** Resolves a numeric XML prop. */
export function resolveXmlNumber(props: ASTProps, name: string, ctx: Scope): number | undefined {
    // Missing attributes remain undefined.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return undefined;

    const value = evaluate(attribute, ctx);
    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? undefined : numberValue;
}

/** Resolves a raw value XML prop for bindings and object literals. */
export function resolveXmlValue(props: ASTProps, name: string, ctx: Scope): unknown {
    // Missing attributes remain undefined.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return undefined;

    return evaluate(attribute, ctx);
}

/** Return whether an XML node passes its optional conditional expression. */
export function isVisibleXmlNode(node: ASTNode, ctx: Scope): boolean {
    if (node.params.if == null) return true;

    return Boolean(evaluate(node.params.if, ctx));
}

/** Resolves and validates a finite string-valued XML attribute. */
export function resolveXmlEnum<const T extends string>(
    props: ASTProps,
    name: string,
    ctx: Scope,
    values: readonly T[],
    componentName: string
): T | undefined {
    const value = resolveXmlString(props, name, ctx);
    if (value == null) return undefined;

    // Keep untrusted XML values out of Astryx lookup maps.
    const matchingValue = values.find((candidate) => candidate === value);
    if (matchingValue == null) {
        throw new Error(`Unsupported ${componentName} ${name} '${value}'`);
    }

    return matchingValue;
}

/** Resolves Astryx input status attributes into the component object shape. */
export function resolveXmlStatus(
    props: ASTProps,
    ctx: Scope
): { type: 'warning' | 'error' | 'success'; message?: string } | undefined {
    // Omit status when the XML attribute is absent.
    if (readXmlProp(props, 'status') == null) return undefined;

    const type = resolveXmlEnum(props, 'status', ctx, ['warning', 'error', 'success'], 'input') ?? 'error';
    const message = resolveXmlString(props, 'statusMessage', ctx);

    return { type, ...(message && { message }) };
}

/** Resolves an Astryx spacing-scale attribute. */
export function resolveXmlSpacing(
    props: ASTProps,
    name: string,
    ctx: Scope
): XmlSpacing | undefined {
    const value = resolveXmlNumber(props, name, ctx);
    // Missing optional spacing attributes stay absent.
    if (value == null) return undefined;

    const spacing = XML_SPACING.find((candidate) => candidate === value);
    if (spacing == null) {
        throw new Error(`Unsupported spacing value '${value}'`);
    }

    return spacing;
}

/** Resolves a serializable Astryx width or height value. */
export function resolveXmlSizeValue(props: ASTProps, name: string, ctx: Scope): string | number | undefined {
    const value = resolveXmlValue(props, name, ctx);

    // Astryx sizing props only accept CSS strings and pixel numbers.
    if (value == null || value === '') return undefined;
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`${name} must evaluate to a string or number`);
    }

    return value;
}
