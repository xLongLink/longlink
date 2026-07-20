import { useState } from 'react';
import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { useBindableValue } from './binding';
import {
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from './props';

/** Renders an Astryx radio list with a controlled XML value. */
export function RadioList({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState(String(binding.initialValue ?? ''));
    const value = binding.bound ? String(binding.currentValue ?? '') : localValue;
    const orientation = resolveXmlEnum(props, 'orientation', ctx, ['vertical', 'horizontal'], 'vertical', 'RadioList');
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md'], 'md', 'RadioList');

    return (
        <AstryxRadioList
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
            label={resolveXmlLabel(props, ctx, 'RadioList')}
            onChange={(nextValue) => {
                if (binding.bound) binding.setValue(nextValue);
                else setLocalValue(nextValue);
            }}
            orientation={orientation}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        >
            {renderNode(nodes, ctx)}
        </AstryxRadioList>
    );
}

/** Renders one data-oriented Astryx radio option. */
export function RadioListItem({ props }: Props) {
    const { ctx } = useXmlContext();

    return (
        <AstryxRadioListItem
            description={resolveXmlString(props, 'description', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            label={resolveXmlLabel(props, ctx, 'RadioListItem')}
            value={requireXmlString(props, 'value', ctx, 'RadioListItem')}
        />
    );
}
