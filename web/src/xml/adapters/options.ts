import { z } from 'zod';
import type { ASTNode, Scope } from '../types';
import type { StoneIconName } from '@/components/ui/Icon';
import { isVisibleXmlNode, resolveXmlProps, xmlIconSchema, xmlNonblankStringSchema } from '../core/props';

const optionPropsSchema = z.object({
    icon: xmlIconSchema.optional(),
    label: z.string().optional(),
    value: z.unknown().refine((value) => value !== undefined, 'is required'),
});

type Option = { icon?: StoneIconName; label: string; value: string };
type RawOption = { icon?: StoneIconName; label: string; value: unknown };

/** Resolves visible Option nodes for choice controls. */
export function resolveOptions(nodes: ASTNode[], scope: Scope): Option[];

/** Resolves visible Option nodes without coercing their values. */
export function resolveOptions(nodes: ASTNode[], scope: Scope, rawValues: true): RawOption[];

export function resolveOptions(nodes: ASTNode[], scope: Scope, rawValues = false): Option[] | RawOption[] {
    const options = nodes
        .filter((node) => node.name === 'Option' && isVisibleXmlNode(node, scope))
        .map((node) => {
            const { icon, label, value } = resolveXmlProps(node.params, scope, optionPropsSchema, ['label', 'value']);

            return { icon, label, value };
        });

    if (rawValues) {
        return options.map(({ icon, label, value }) => ({
            icon,
            label: label ?? xmlNonblankStringSchema.parse(value),
            value,
        }));
    }

    return options.map(({ icon, label, value }) => {
        const optionValue = xmlNonblankStringSchema.parse(value);

        return { icon, label: label ?? optionValue, value: optionValue };
    });
}
