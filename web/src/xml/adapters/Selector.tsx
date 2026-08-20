import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { Selector as AstryxSelector } from '@astryxdesign/core/Selector';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';

export function Selector({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? undefined : String(value)));
    const options = nodes
        .filter((node) => node.name === 'Option' && isVisibleXmlNode(node, ctx))
        .map((node) => {
            const value = requireXmlString(node.params, 'value', ctx, 'Option');
            const labelValue = resolveXml(node.params, 'label', ctx);
            const label = typeof labelValue === 'string' ? labelValue : value;

            return { value, label };
        });

    // Selectors require at least one visible option.
    if (options.length === 0) {
        throw new Error('Selector requires at least one Option');
    }

    return (
        <AstryxSelector
            label={requireXmlString(props, 'label', ctx, 'Selector')}
            onChange={binding.setValue}
            options={options}
            value={binding.value}
        />
    );
}
