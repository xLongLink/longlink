import type { Props } from '../types';
import { resolveOptions } from './options';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';
import { Selector as AstryxSelector } from '@astryxdesign/core/Selector';

export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : String(value)));
    const options = resolveOptions(nodes, ctx);

    // Selectors require at least one visible option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one Option');
    }

    return (
        <AstryxSelector
            label={resolveXmlProps(props, ctx, { label: 'raw' }, xmlLabelPropsSchema).label}
            onChange={binding.setValue}
            options={options}
            value={binding.value}
        />
    );
}
