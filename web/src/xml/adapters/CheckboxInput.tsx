import { useState } from 'react';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';
import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { toXmlBoolean, useBindableValue } from './binding';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from './props';

/** Renders an Astryx checkbox with boolean Valtio binding. */
export function CheckboxInput({ props }: Props) {
    const { ctx } = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState(toXmlBoolean(binding.initialValue));
    const value = binding.bound ? toXmlBoolean(binding.currentValue) : localValue;
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md'], 'md', 'CheckboxInput');

    return (
        <AstryxCheckboxInput
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isReadOnly={resolveXmlBoolean(props, 'isReadOnly', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
            label={resolveXmlLabel(props, ctx, 'CheckboxInput')}
            onChange={(nextValue) => {
                if (binding.bound) binding.setValue(nextValue);
                else setLocalValue(nextValue);
            }}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
