import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Selector as AstryxSelector } from '@astryxdesign/core/Selector';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema } from '../core/props';

const selectorPropsSchema = z.object({ label: xmlNonblankStringSchema });
const optionPropsSchema = z.object({
    label: z.string().optional(),
    value: xmlNonblankStringSchema,
});

export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : String(value)));
    const options = nodes
        .filter((node) => node.name === 'Option' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const { label: labelValue, value } = resolveXmlProps(
                node.params,
                ctx,
                { label: 'scalar', value: 'raw' },
                optionPropsSchema
            );
            const label = labelValue ?? value;

            return { value, label };
        });

    // Selectors require at least one visible option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one Option');
    }

    return (
        <AstryxSelector
            label={resolveXmlProps(props, ctx, { label: 'raw' }, selectorPropsSchema).label}
            onChange={binding.setValue}
            options={options}
            value={binding.value}
        />
    );
}
