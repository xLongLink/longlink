import { NumberInput as AstryxNumberInput } from '@astryxdesign/core-0-3/NumberInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders an Astryx numeric field with numeric Valtio writes. */
export function NumberInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? null : Number(value)));
    const hasClear = resolveXml(props, 'hasClear', ctx) === true;
    const sizeValue = resolveXml(props, 'size', ctx);
    const autoComplete = resolveXml(props, 'autoComplete', ctx);
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isIntegerOnly = resolveXml(props, 'isIntegerOnly', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const max = resolveXml(props, 'max', ctx);
    const min = resolveXml(props, 'min', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const step = resolveXml(props, 'step', ctx);
    const units = resolveXml(props, 'units', ctx);
    const width = resolveXml(props, 'width', ctx);
    const size = isXmlEnum(sizeValue, ['sm', 'md', 'lg']) ? sizeValue : 'md';
    const common = {
        autoComplete: isXmlString(autoComplete) ? autoComplete : undefined,
        description: isXmlString(description) ? description : undefined,
        disabledMessage: isXmlString(disabledMessage) ? disabledMessage : undefined,
        htmlName: isXmlString(htmlName) ? htmlName : undefined,
        isDisabled: isXmlBoolean(isDisabled) ? isDisabled : undefined,
        isIntegerOnly: isXmlBoolean(isIntegerOnly) ? isIntegerOnly : undefined,
        isLabelHidden: isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined,
        isOptional: isXmlBoolean(isOptional) ? isOptional : undefined,
        isRequired: isXmlBoolean(isRequired) ? isRequired : undefined,
        label: requireXmlString(props, 'label', ctx, 'NumberInput'),
        max: isXmlNumber(max) ? max : undefined,
        min: isXmlNumber(min) ? min : undefined,
        placeholder: isXmlString(placeholder) ? placeholder : undefined,
        size,
        status: resolveInputStatus(props, ctx),
        step: isXmlNumber(step) ? step : undefined,
        units: isXmlString(units) ? units : undefined,
        value: binding.value,
        width: isXmlString(width) || isXmlNumber(width) ? width : undefined,
    };

    // Astryx uses a discriminated callback type for clearable fields.
    if (hasClear) {
        return <AstryxNumberInput {...common} hasClear onChange={binding.setValue} />;
    }

    return <AstryxNumberInput {...common} onChange={binding.setValue} />;
}
