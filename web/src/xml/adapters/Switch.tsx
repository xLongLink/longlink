import { useState } from 'react';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';
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

/** Renders an Astryx switch with boolean Valtio binding. */
export function Switch({ props }: Props) {
    const { ctx } = useXmlContext();
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
            label={resolveXmlLabel(props, ctx, 'Switch')}
            labelPosition={labelPosition}
            labelSpacing={labelSpacing}
            onChange={(nextValue) => {
                if (binding.bound) binding.setValue(nextValue);
                else setLocalValue(nextValue);
            }}
            status={resolveXmlStatus(props, ctx)}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
