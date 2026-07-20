import { useState } from 'react';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';
import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { useBindableValue } from './binding';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlNumber,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from './props';

/** Renders a single-value Astryx slider with numeric Valtio binding. */
export function Slider({ props }: Props) {
    const { ctx } = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx, 'number');
    const initialValue = Number(binding.initialValue ?? 0);
    const [localValue, setLocalValue] = useState(initialValue);
    const currentValue = Number(binding.currentValue ?? initialValue);
    const value = binding.bound ? currentValue : localValue;
    const orientation = resolveXmlEnum(props, 'orientation', ctx, ['horizontal', 'vertical'], 'horizontal', 'Slider');
    const valueDisplay = resolveXmlEnum(props, 'valueDisplay', ctx, ['tooltip', 'text', 'none'], 'tooltip', 'Slider');

    return (
        <AstryxSlider
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
            label={resolveXmlLabel(props, ctx, 'Slider')}
            max={resolveXmlNumber(props, 'max', ctx, 100)}
            min={resolveXmlNumber(props, 'min', ctx, 0)}
            onChange={(nextValue: number) => {
                if (binding.bound) binding.setValue(nextValue);
                else setLocalValue(nextValue);
            }}
            orientation={orientation}
            status={resolveXmlStatus(props, ctx)}
            step={resolveXmlNumber(props, 'step', ctx, 1)}
            value={value}
            valueDisplay={valueDisplay}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
