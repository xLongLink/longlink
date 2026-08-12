import { NumberInput as AstryxNumberInput } from '@astryxdesign/core-0-3/NumberInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

const FIELD_STATUS_VARIANTS = ['attached', 'detached', 'tooltip'] as const;
const NUMBER_INPUT_SIZES = ['sm', 'md', 'lg'] as const;

/** Renders an Astryx numeric field with numeric Valtio writes. */
export function NumberInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? null : Number(value)));
    const max = resolveXml(props, 'max', ctx);
    const min = resolveXml(props, 'min', ctx);
    const size = resolveXml(props, 'size', ctx);
    const step = resolveXml(props, 'step', ctx);
    const units = resolveXml(props, 'units', ctx);
    const width = resolveXml(props, 'width', ctx);
    const hasClear = resolveXml(props, 'hasClear', ctx) === true;
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const autoComplete = resolveXml(props, 'autoComplete', ctx);
    const hasAutoFocus = resolveXml(props, 'hasAutoFocus', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const isIntegerOnly = resolveXml(props, 'isIntegerOnly', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);

    if (size != null && !isXmlEnum(size, NUMBER_INPUT_SIZES)) {
        throw new Error(`Unsupported NumberInput size '${String(size)}'`);
    }

    if (statusVariant != null && !isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)) {
        throw new Error(`Unsupported NumberInput statusVariant '${String(statusVariant)}'`);
    }
    const common = {
        max: isXmlNumber(max) ? max : undefined,
        min: isXmlNumber(min) ? min : undefined,
        size,
        step: isXmlNumber(step) ? step : undefined,
        label: requireXmlString(props, 'label', ctx, 'NumberInput'),
        units: isXmlString(units) ? units : undefined,
        value: binding.value,
        width: isXmlString(width) || isXmlNumber(width) ? width : undefined,
        status: resolveInputStatus(props, ctx),
        htmlName: isXmlString(htmlName) ? htmlName : undefined,
        isDisabled: isXmlBoolean(isDisabled) ? isDisabled : undefined,
        isOptional: isXmlBoolean(isOptional) ? isOptional : undefined,
        isRequired: isXmlBoolean(isRequired) ? isRequired : undefined,
        description: isXmlString(description) ? description : undefined,
        placeholder: isXmlString(placeholder) ? placeholder : undefined,
        autoComplete: isXmlString(autoComplete) ? autoComplete : undefined,
        hasAutoFocus: isXmlBoolean(hasAutoFocus) ? hasAutoFocus : undefined,
        labelTooltip: isXmlString(labelTooltip) ? labelTooltip : undefined,
        isIntegerOnly: isXmlBoolean(isIntegerOnly) ? isIntegerOnly : undefined,
        isLabelHidden: isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined,
        statusVariant,
        disabledMessage: isXmlString(disabledMessage) ? disabledMessage : undefined,
    };

    // Astryx uses a discriminated callback type for clearable fields.
    if (hasClear) {
        return <AstryxNumberInput {...common} hasClear onChange={binding.setValue} />;
    }

    return <AstryxNumberInput {...common} onChange={binding.setValue} />;
}
