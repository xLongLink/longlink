import { Slider as AstryxSlider } from '@astryxdesign/core/Slider';
import type { Props } from '../types';
import { resolveInputStatus } from '../input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { ORIENTATIONS, SLIDER_VALUE_DISPLAYS } from '../constants';
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

    const commonProps = {
        description: resolveStringProp(props, 'description', ctx),
        disabledMessage: resolveStringProp(props, 'disabledMessage', ctx),
        htmlName: resolveStringProp(props, 'htmlName', ctx),
        isDisabled: resolveBooleanProp(props, 'isDisabled', ctx),
        isLabelHidden: resolveBooleanProp(props, 'isLabelHidden', ctx),
        isOptional: resolveBooleanProp(props, 'isOptional', ctx),
        isRequired: resolveBooleanProp(props, 'isRequired', ctx),
        label: requireXmlString(props, 'label', ctx, 'Slider'),
        labelTooltip: typeof labelTooltip === 'string' ? labelTooltip : undefined,
        max: resolveNumberProp(props, 'max', ctx),
        min: resolveNumberProp(props, 'min', ctx),
        orientation: orientationValue,
        status: resolveInputStatus(props, ctx),
        step: resolveNumberProp(props, 'step', ctx),
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

/** Resolves an optional XML boolean prop. */
function resolveBooleanProp(props: Props['props'], name: string, ctx: ReturnType<typeof useXmlRuntime>['scope']) {
    const value = resolveXml(props, name, ctx);
    return typeof value === 'boolean' ? value : undefined;
}

/** Resolves an optional XML number prop. */
function resolveNumberProp(props: Props['props'], name: string, ctx: ReturnType<typeof useXmlRuntime>['scope']) {
    const value = resolveXml(props, name, ctx);
    return typeof value === 'number' ? value : undefined;
}

/** Resolves an optional XML string prop. */
function resolveStringProp(props: Props['props'], name: string, ctx: ReturnType<typeof useXmlRuntime>['scope']) {
    const value = resolveXml(props, name, ctx);
    return typeof value === 'string' ? value : undefined;
}
