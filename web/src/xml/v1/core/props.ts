import type { ReactNode } from 'react';
import { evaluate } from '../expressions';
import type { ASTNode, ASTProps, ExecutionContext } from '../types';
import { resolveTranslation } from './i18n';

const XML_SPACING = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const;

export type XmlSpacing = (typeof XML_SPACING)[number];

/** Reads a compiled XML prop without coercion. */
export function readXmlProp(props: ASTProps, name: string): ASTProps[string] | undefined {
    const value = props[name];

    return value == null || (value.kind === 'text' && value.value === '') ? undefined : value;
}

/** Resolves a required XML string prop and throws a tag-specific error when missing. */
export function requireXmlString(props: ASTProps, name: string, ctx: ExecutionContext, componentName: string): string {
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
export function resolveXmlString(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue = ''): string {
    // Missing attributes keep the caller-provided default.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return defaultValue;

    const value = evaluate(attribute, ctx);

    return value == null ? defaultValue : String(value);
}

/** Resolves a boolean XML prop. */
export function resolveXmlBoolean(
    props: ASTProps,
    name: string,
    ctx: ExecutionContext,
    defaultValue?: boolean
): boolean | undefined {
    // Missing attributes keep the caller-provided default.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return defaultValue;

    const value = evaluate(attribute, ctx);

    // Preserve explicit XML boolean literals before falling back to truthiness.
    if (value === true || value === 'true') return true;

    // Preserve explicit false values instead of coercing them through truthiness.
    if (value === false || value === 'false') return false;

    // Nullish or empty values keep the caller-provided default.
    if (value == null || value === '') return defaultValue;

    return Boolean(value);
}

/** Resolves a numeric XML prop. */
export function resolveXmlNumber(
    props: ASTProps,
    name: string,
    ctx: ExecutionContext,
    defaultValue?: number
): number | undefined {
    // Missing attributes keep the caller-provided default.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return defaultValue;

    const value = evaluate(attribute, ctx);
    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? defaultValue : numberValue;
}

/** Resolves a raw value XML prop for bindings and object literals. */
export function resolveXmlValue(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue?: unknown): unknown {
    // Missing attributes keep the caller-provided default.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return defaultValue;

    return evaluate(attribute, ctx);
}

/** Resolves text from translation, value, or rendered XML children. */
export function resolveXmlContent(
    props: ASTProps,
    ctx: ExecutionContext,
    value: unknown,
    renderChildren: () => ReactNode
): ReactNode {
    return readXmlProp(props, 'i18n')
        ? resolveTranslation(props, ctx)
        : value != null
          ? String(value)
          : renderChildren();
}

/** Return whether an XML node passes its optional conditional expression. */
export function isVisibleXmlNode(node: ASTNode, ctx: ExecutionContext): boolean {
    if (node.params?.if == null) return true;

    return Boolean(evaluate(node.params.if, ctx));
}

/** Resolves an accessible XML label from a translation key or label attribute. */
export function resolveXmlLabel(
    props: ASTProps,
    ctx: ExecutionContext,
    componentName: string,
    attribute = 'label'
): string {
    const label = readXmlProp(props, attribute);
    const i18n = readXmlProp(props, 'i18n');

    // Accessible names must have one unambiguous literal or translated source.
    if ((label == null) === (i18n == null)) {
        throw new Error(`${componentName} requires exactly one of ${attribute} or i18n`);
    }

    if (i18n != null) return resolveTranslation(props, ctx);

    return requireXmlString(props, attribute, ctx, componentName);
}

/** Resolves and validates a finite string-valued XML attribute. */
export function resolveXmlEnum<const T extends string>(
    props: ASTProps,
    name: string,
    ctx: ExecutionContext,
    values: readonly T[],
    defaultValue: T,
    componentName: string
): T {
    const value = resolveXmlString(props, name, ctx, defaultValue);

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
    ctx: ExecutionContext
): { type: 'warning' | 'error' | 'success'; message?: string } | undefined {
    // Omit status when the XML attribute is absent.
    if (readXmlProp(props, 'status') == null) return undefined;

    const type = resolveXmlEnum(props, 'status', ctx, ['warning', 'error', 'success'], 'error', 'input');
    const message = resolveXmlString(props, 'statusMessage', ctx);

    return { type, ...(message && { message }) };
}

/** Resolves an Astryx spacing-scale attribute. */
export function resolveXmlSpacing(
    props: ASTProps,
    name: string,
    ctx: ExecutionContext,
    defaultValue?: XmlSpacing
): XmlSpacing | undefined {
    const value = resolveXmlNumber(props, name, ctx, defaultValue);
    // Missing optional spacing attributes stay absent.
    if (value == null) return undefined;

    const spacing = XML_SPACING.find((candidate) => candidate === value);
    if (spacing == null) {
        throw new Error(`Unsupported spacing value '${value}'`);
    }

    return spacing;
}

/** Resolves a serializable Astryx width or height value. */
export function resolveXmlSizeValue(props: ASTProps, name: string, ctx: ExecutionContext): string | number | undefined {
    const value = resolveXmlValue(props, name, ctx);

    // Astryx sizing props only accept CSS strings and pixel numbers.
    if (value == null || value === '') return undefined;
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`${name} must evaluate to a string or number`);
    }

    return value;
}
