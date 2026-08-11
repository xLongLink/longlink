import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';
import { useState } from 'react';
import { setXmlBinding, toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx switch with boolean Valtio binding. */
export function Switch({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState(toXmlBoolean(binding.initialValue));
    const value = binding.bound ? toXmlBoolean(binding.currentValue) : localValue;
    const labelPosition = resolveXmlEnum(props, 'labelPosition', ctx, ['start', 'end'], 'end', 'Switch');
    const labelSpacing = resolveXmlEnum(props, 'labelSpacing', ctx, ['hug', 'spread'], 'hug', 'Switch');

    return (
        <AstryxSwitch
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
            label={resolveXmlLabel(props, ctx, services, 'Switch')}
            labelPosition={labelPosition}
            labelSpacing={labelSpacing}
            onChange={(nextValue) => {
                setXmlBinding(binding, setLocalValue, nextValue);
            }}
            status={resolveXmlStatus(props, ctx)}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
