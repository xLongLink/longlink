import { evaluate } from '../expressions';
import type { ASTNode, ASTProps, Scope } from '../types';

export type XmlScalar = number | boolean | string | undefined;

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

/** Resolves an XML scalar prop. */
export function resolveXml(props: ASTProps, name: string, ctx: Scope): XmlScalar {
    const attribute = readXmlProp(props, name);
    if (attribute == null) return undefined;

    const value = evaluate(attribute, ctx);
    if (value == null || value === '') return undefined;
    if (typeof value === 'number') return value;

    const numberValue = Number(value);

    if (!Number.isNaN(numberValue)) return numberValue;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;

    return String(value);
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
