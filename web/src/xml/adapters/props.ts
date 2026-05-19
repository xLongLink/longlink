import { getVersion } from 'valtio';
import { compile, evaluate } from '../expressions';
import type { ASTProps, ExecutionContext, XmlBindableValue } from '../types';

/** Reads a raw XML prop value without coercion. */
export function readXmlProp(props: ASTProps, name: string): string | undefined {
    const value = props[name];

    return value == null || value === '' ? undefined : value;
}

/** Resolves a required XML string prop and throws a tag-specific error when missing. */
export function requireXmlString(props: ASTProps, name: string, ctx: ExecutionContext, componentName: string): string {
    const rawValue = readXmlProp(props, name);

    if (rawValue == null) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    const value = evaluate(rawValue, ctx);

    if (value == null) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    if (typeof value === 'object' || typeof value === 'function') {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    const stringValue = String(value);

    if (!stringValue.trim()) {
        throw new Error(`${componentName} requires a string ${name}`);
    }

    return stringValue;
}

/** Resolves a string XML prop. */
export function resolveXmlString(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue = ''): any {
    const rawValue = readXmlProp(props, name);

    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

    return value == null ? defaultValue : String(value);
}

/** Resolves a boolean XML prop. */
export function resolveXmlBoolean(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue?: boolean): any {
    const rawValue = readXmlProp(props, name);

    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    if (value == null || value === '') return defaultValue;

    return Boolean(value);
}

/** Resolves a numeric XML prop. */
export function resolveXmlNumber(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue?: number): any {
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
): any {
    const rawValue = readXmlProp(props, name);

    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

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
): any {
    const rawValue = readXmlProp(props, name);

    if (rawValue == null) return defaultValue;

    const value = evaluate(rawValue, ctx);

    return value as XmlBindableValue | undefined;
}

/** Compiles an XML expression prop for deferred execution. */
export function resolveXmlExpression(props: ASTProps, name: string): any {
    const rawValue = readXmlProp(props, name);

    if (rawValue == null) return undefined;

    return compile(rawValue);
}

/** Returns true when a raw XML value is backed by a Valtio proxy. */
export function isXmlValueState(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && getVersion(value as object) !== undefined;
}
