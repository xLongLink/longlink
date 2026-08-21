import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema } from '../core/props';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';

const radioListPropsSchema = z.object({ label: xmlNonblankStringSchema });
const optionPropsSchema = z.object({
    label: z.string().optional(),
    value: xmlNonblankStringSchema,
});

export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));

    return (
        <AstryxRadioList
            label={resolveXmlProps(props, ctx, { label: 'raw' }, radioListPropsSchema).label}
            onChange={binding.setValue}
            size="sm"
            value={binding.value}
        >
            {nodes
                .filter((node) => node.name === 'Option' && isVisibleXmlNode(node, ctx))
                .map((node, index) => {
                    const { label: labelValue, value } = resolveXmlProps(
                        node.params,
                        ctx,
                        { label: 'scalar', value: 'raw' },
                        optionPropsSchema
                    );
                    const label = labelValue ?? value;

                    return <AstryxRadioListItem key={index} label={label} value={value} />;
                })}
        </AstryxRadioList>
    );
}
