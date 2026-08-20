import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { requireXmlString } from '../core/props';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';

export function RadioList({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));

    return (
        <AstryxRadioList
            label={requireXmlString(props, 'label', ctx, 'RadioList')}
            onChange={binding.setValue}
            value={binding.value}
        >
            {renderNode(nodes, ctx)}
        </AstryxRadioList>
    );
}

export function RadioListItem({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return (
        <AstryxRadioListItem
            label={requireXmlString(props, 'label', ctx, 'RadioListItem')}
            value={requireXmlString(props, 'value', ctx, 'RadioListItem')}
        />
    );
}
