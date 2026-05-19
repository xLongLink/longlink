import { compile, evaluate } from '@xml/core/expressions';
import type { ASTProps, ExecutionContext, XmlBindableValue } from '@xml/types';
import { getVersion } from 'valtio';

/** Resolves a raw XML prop against the runtime context. */
export function resolveXmlProp(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue?: unknown): any {
    const rawValue = props[name];

    if (rawValue == null || rawValue === '') return defaultValue;

    return evaluate(rawValue, ctx);
}

/** Resolves a string XML prop. */
export function resolveXmlString(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue = ''): any {
    const value = resolveXmlProp(props, name, ctx, defaultValue);

    return value == null ? defaultValue : String(value);
}

/** Resolves a boolean XML prop. */
export function resolveXmlBoolean(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue?: boolean): any {
    const value = resolveXmlProp(props, name, ctx, defaultValue);

    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    if (value == null || value === '') return defaultValue;

    return Boolean(value);
}

/** Resolves a numeric XML prop. */
export function resolveXmlNumber(props: ASTProps, name: string, ctx: ExecutionContext, defaultValue?: number): any {
    const value = resolveXmlProp(props, name, ctx, defaultValue);
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
    const value = resolveXmlProp(props, name, ctx, defaultValue);

    return Array.isArray(value) ? value.map((entry) => String(entry)) : defaultValue;
}

/** Resolves a raw value XML prop for bindings and object literals. */
export function resolveXmlValue(
    props: ASTProps,
    name: string,
    ctx: ExecutionContext,
    defaultValue?: XmlBindableValue
): any {
    const value = resolveXmlProp(props, name, ctx, defaultValue);

    return value as XmlBindableValue | undefined;
}

/** Compiles an XML expression prop for deferred execution. */
export function resolveXmlExpression(props: ASTProps, name: string): any {
    const rawValue = props[name];

    if (rawValue == null || rawValue === '') return undefined;

    return compile(rawValue);
}

/** Returns true when a raw XML value is backed by a Valtio proxy. */
export function isXmlValueState(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && getVersion(value as object) !== undefined;
}
