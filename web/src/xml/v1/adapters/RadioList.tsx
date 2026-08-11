import { RadioList as AstryxRadioList, RadioListItem as AstryxRadioListItem } from '@astryxdesign/core/RadioList';
import { useState } from 'react';
import { setXmlBinding, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import {
    requireXmlString,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx radio list with a controlled XML value. */
export function RadioList({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
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
            label={resolveXmlLabel(props, ctx, services, 'RadioList')}
            onChange={(nextValue) => {
                setXmlBinding(binding, setLocalValue, nextValue);
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
    const { scope: ctx, services } = useXmlRuntime();

    return (
        <AstryxRadioListItem
            description={resolveXmlString(props, 'description', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            label={resolveXmlLabel(props, ctx, services, 'RadioListItem')}
            value={requireXmlString(props, 'value', ctx, 'RadioListItem')}
        />
    );
}
