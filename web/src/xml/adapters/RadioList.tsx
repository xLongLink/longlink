import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isVisibleXmlNode, requireXmlString, resolveXml } from '../core/props';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';

export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const options = nodes.filter((node) => node.name === 'Option' && isVisibleXmlNode(node, ctx));

    return (
        <AstryxRadioList
            label={requireXmlString(props, 'label', ctx, 'RadioList')}
            onChange={binding.setValue}
            value={binding.value}
        >
            {options.map((node, index) => {
                const value = requireXmlString(node.params, 'value', ctx, 'Option');
                const labelValue = resolveXml(node.params, 'label', ctx);
                const label = typeof labelValue === 'string' ? labelValue : value;

                return <AstryxRadioListItem key={index} label={label} value={value} />;
            })}
        </AstryxRadioList>
    );
}
