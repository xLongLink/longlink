import { z } from 'zod';
import { evaluate } from '../expressions/evaluate';
import type { ASTNode, ASTProps, Scope } from '../types';
import { SPACING_VALUES, XML_LAYOUT_GAP } from '../constants';

type XmlScalar = number | boolean | string | undefined;
export type XmlSpacing = (typeof SPACING_VALUES)[number];

export const xmlNonblankStringSchema = z
    .union([z.string(), z.number(), z.boolean()])
    .transform(String)
    .refine((value) => value.trim().length > 0, 'must not be blank');
export const xmlLabelPropsSchema = z.object({ label: xmlNonblankStringSchema });
export const xmlPositiveNumberSchema = z.number().positive('must be a positive number');
export const xmlPositiveIntegerSchema = z.number().int('must be an integer').positive('must be positive');
export const xmlSpacingSchema = z
    .number()
    .refine((value) => SPACING_VALUES.includes(value as XmlSpacing), 'must use the spacing scale')
    .transform((value) => value as XmlSpacing);
export const xmlSpacingWithDefaultSchema = xmlSpacingSchema.default(XML_LAYOUT_GAP);

/** Reads a compiled XML prop without coercion. */
export function readXmlProp(props: ASTProps, name: string): ASTProps[string] | undefined {
    const value = props[name];

    return value == null || (value.kind === 'text' && value.value === '') ? undefined : value;
}

/** Resolves an XML scalar prop. */
export function resolveXml(props: ASTProps, name: string, ctx: Scope): XmlScalar {
    const attribute = readXmlProp(props, name);
    if (attribute == null) return undefined;

    const value = evaluate(attribute, ctx);
    if (value == null || value === '') return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;

    const numberValue = Number(value);

    if (!Number.isNaN(numberValue)) return numberValue;

    return String(value);
}

/** Resolves a raw value XML prop for bindings and object literals. */
export function resolveXmlValue(props: ASTProps, name: string, ctx: Scope): unknown {
    // Missing attributes remain undefined.
    const attribute = readXmlProp(props, name);
    if (attribute == null) return undefined;

    return evaluate(attribute, ctx);
}

/** Resolves named XML props by mode and validates the result with an object schema. */
export function resolveXmlProps<T extends z.ZodObject>(
    props: ASTProps,
    ctx: Scope,
    fields: Record<string, 'scalar' | 'raw'>,
    schema: T
): z.output<T> {
    const values: Record<string, unknown> = {};

    for (const [name, mode] of Object.entries(fields)) {
        // Keep legacy scalar coercion distinct from raw evaluated values.
        switch (mode) {
            case 'scalar':
                values[name] = resolveXml(props, name, ctx);
                break;
            case 'raw':
                values[name] = resolveXmlValue(props, name, ctx);
                break;
        }
    }

    const result = schema.safeParse(values);
    if (result.success) return result.data;

    const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'props'}: ${issue.message}`)
        .join('; ');

    throw new Error(`Invalid XML props: ${details}`);
}

/** Return whether an XML node passes its optional conditional expression. */
export function isVisibleXmlNode(node: ASTNode, ctx: Scope): boolean {
    if (node.params.if == null) return true;

    return Boolean(evaluate(node.params.if, ctx));
}
