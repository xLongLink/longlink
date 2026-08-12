import { Slider as AstryxSlider } from '@astryxdesign/core-0-3/Slider';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    requireXmlString,
    resolveXmlNumber,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders a single-value Astryx slider with numeric Valtio binding. */
export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => Number(value ?? 0));
    const orientation = resolveXmlEnum(props, 'orientation', ctx, ['horizontal', 'vertical'], 'Slider') ?? 'horizontal';
    const valueDisplay = resolveXmlEnum(props, 'valueDisplay', ctx, ['tooltip', 'text', 'none'], 'Slider') ?? 'tooltip';

    return (
        <AstryxSlider
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx)}
            label={requireXmlString(props, 'label', ctx, 'Slider')}
            max={resolveXmlNumber(props, 'max', ctx) ?? 100}
            min={resolveXmlNumber(props, 'min', ctx) ?? 0}
            onChange={binding.setValue}
            orientation={orientation}
            status={resolveXmlStatus(props, ctx)}
            step={resolveXmlNumber(props, 'step', ctx) ?? 1}
            value={binding.value}
            valueDisplay={valueDisplay}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
