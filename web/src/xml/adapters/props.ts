import type { ExpressionResolver } from '../expressions/types';
import type { ASTProps, ExecutionContext, XmlBindableValue } from '../types';
import { resolveTranslation } from '../core/i18n';
import { compile, evaluate } from '../expressions';

export type XmlSpacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

/** Reads a raw XML prop value without coercion. */
export function readXmlProp(props: ASTProps, name: string): string | undefined {
    const value = props[name];

    return value == null || value === '' ? undefined : value;
}

/** Resolves a required XML string prop and throws a tag-specific error when missing. */
export function requireXmlString(props: ASTProps, name: string, ctx: ExecutionContext, componentName: string): string {
    // Required string attributes must be present before evaluation.
    const rawValue = readXmlProp(props, name);
    if (rawValue == null) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    // Evaluated nullish values are treated as missing strings.
    const value = evaluate(rawValue, ctx);
    if (value == null) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    // XML string props cannot accept structured values.
    if (typeof value === 'object' || typeof value === 'function') {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    const stringValue = String(value);

    // Whitespace-only values should fail like missing values.
    if (!stringValue.trim()) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    return stringValue;
}

/** Resolves a string XML prop. */
export function resolveXmlString(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue = ''): string {
    // Missing attributes keep the caller-provided default.
    const rawValue = readXmlProp(props, name);
    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

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
    const rawValue = readXmlProp(props, name);
    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

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
    const rawValue = readXmlProp(props, name);
    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);
    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? defaultValue : numberValue;
}

/** Resolves a string-array XML prop. */
export function resolveXmlStringArray(
    props: ASTProps,
    name: string,
    ctx: ExecutionContext,
    defaultValue: string[] = []
): string[] {
    // Missing attributes keep the caller-provided default.
    const rawValue = readXmlProp(props, name);
    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

    // Array props must stay arrays so callers can rely on list semantics.
    if (!Array.isArray(value)) {
        throw new Error(`${name} must evaluate to an array`);
    }

    return value.map((entry) => String(entry));
}

/** Resolves a raw value XML prop for bindings and object literals. */
export function resolveXmlValue(
    props: ASTProps,
    name: string,
    ctx: ExecutionContext,
    defaultValue?: XmlBindableValue
): XmlBindableValue | undefined {
    // Missing attributes keep the caller-provided default.
    const rawValue = readXmlProp(props, name);
    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

    return value as XmlBindableValue | undefined;
}

/** Compiles an XML expression prop for deferred execution. */
export function resolveXmlExpression(props: ASTProps, name: string): ExpressionResolver | undefined {
    // Missing expression props do not produce deferred evaluators.
    const rawValue = readXmlProp(props, name);
    if (rawValue == null) return undefined;

    return compile(rawValue);
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
    if (!values.includes(value as T)) {
        throw new Error(`Unsupported ${componentName} ${name} '${value}'`);
    }

    return value as T;
}

/** Resolves Astryx input status attributes into the component object shape. */
export function resolveXmlStatus(
    props: ASTProps,
    ctx: ExecutionContext
): { type: 'warning' | 'error' | 'success'; message?: string } | undefined {
    const rawStatus = readXmlProp(props, 'status');

    // Omit status when the XML attribute is absent.
    if (rawStatus == null) return undefined;

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
    const allowed: readonly number[] = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10];

    // Missing optional spacing attributes stay absent.
    if (value == null) return undefined;

    if (!allowed.includes(value)) {
        throw new Error(`Unsupported spacing value '${value}'`);
    }

    return value as XmlSpacing;
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
