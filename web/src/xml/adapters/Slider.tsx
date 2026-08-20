import type { Props } from '../types';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { ORIENTATIONS, SLIDER_VALUE_DISPLAYS } from '../constants';
import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

type SliderValue = number | [number, number];

export function Slider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<SliderValue>(props, 'value', ctx, (value) => {
        if (Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === 'number')) {
            return [value[0], value[1]];
        }

        return typeof value === 'number' ? value : 0;
    });
    const orientationValue = resolveXml(props, 'orientation', ctx);
    const valueDisplayValue = resolveXml(props, 'valueDisplay', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const minStepsBetweenThumbs = resolveXml(props, 'minStepsBetweenThumbs', ctx);
    const width = resolveXml(props, 'width', ctx);

    if (!isXmlEnum(orientationValue, [undefined, ...ORIENTATIONS])) {
        throw new Error(`Unsupported Slider orientation '${String(orientationValue)}'`);
    }

    if (!isXmlEnum(valueDisplayValue, [undefined, ...SLIDER_VALUE_DISPLAYS])) {
        throw new Error(`Unsupported Slider valueDisplay '${String(valueDisplayValue)}'`);
    }

    if (
        minStepsBetweenThumbs != null &&
        (typeof minStepsBetweenThumbs !== 'number' ||
            !Number.isInteger(minStepsBetweenThumbs) ||
            minStepsBetweenThumbs < 0)
    ) {
        throw new Error('Slider minStepsBetweenThumbs must be a non-negative integer');
    }

    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const max = resolveXml(props, 'max', ctx);
    const min = resolveXml(props, 'min', ctx);
    const step = resolveXml(props, 'step', ctx);

    const commonProps = {
        description: typeof description === 'string' ? description : undefined,
        disabledMessage: typeof disabledMessage === 'string' ? disabledMessage : undefined,
        htmlName: typeof htmlName === 'string' ? htmlName : undefined,
        isDisabled: typeof isDisabled === 'boolean' ? isDisabled : undefined,
        isLabelHidden: typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined,
        isOptional: typeof isOptional === 'boolean' ? isOptional : undefined,
        isRequired: typeof isRequired === 'boolean' ? isRequired : undefined,
        label: requireXmlString(props, 'label', ctx, 'Slider'),
        labelTooltip: typeof labelTooltip === 'string' ? labelTooltip : undefined,
        max: typeof max === 'number' ? max : undefined,
        min: typeof min === 'number' ? min : undefined,
        orientation: orientationValue,
        status: resolveInputStatus(props, ctx),
        step: typeof step === 'number' ? step : undefined,
        valueDisplay: valueDisplayValue,
        width: typeof width === 'string' || typeof width === 'number' ? width : undefined,
    };

    if (Array.isArray(binding.value)) {
        return (
            <AstryxSlider
                {...commonProps}
                minStepsBetweenThumbs={minStepsBetweenThumbs}
                onChange={binding.setValue}
                value={binding.value}
            />
        );
    }

    return <AstryxSlider {...commonProps} onChange={binding.setValue} value={binding.value} />;
}
