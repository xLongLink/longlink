import type { Props } from '../types';
import { resolveOptions } from './options';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';

export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));

    return (
        <AstryxRadioList
            label={resolveXmlProps(props, ctx, { label: 'raw' }, xmlLabelPropsSchema).label}
            onChange={binding.setValue}
            size="sm"
            value={binding.value}
        >
            {resolveOptions(nodes, ctx).map(({ label, value }, index) => (
                <AstryxRadioListItem key={index} label={label} value={value} />
            ))}
        </AstryxRadioList>
    );
}
