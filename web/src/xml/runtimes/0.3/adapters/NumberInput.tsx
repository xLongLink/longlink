import type { FieldStatusVariant } from '@astryxdesign/core-0-3/Field';
import { NumberInput as AstryxNumberInput, type NumberInputSize } from '@astryxdesign/core-0-3/NumberInput';
import { FIELD_STATUS_VARIANTS, SIZES } from '../constants';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';
import { resolveInputStatus } from './input';

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

    if (size != null && !isXmlEnum(size, SIZES)) {
        throw new Error(`Unsupported NumberInput size '${String(size)}'`);
    }

    if (statusVariant != null && !isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)) {
        throw new Error(`Unsupported NumberInput statusVariant '${String(statusVariant)}'`);
    }
    const inputSize: NumberInputSize | undefined = isXmlEnum(size, SIZES) ? size : undefined;
    const inputStatusVariant: FieldStatusVariant | undefined = isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)
        ? statusVariant
        : undefined;
    const common = {
        max: typeof max === 'number' ? max : undefined,
        min: typeof min === 'number' ? min : undefined,
        size: inputSize,
        step: typeof step === 'number' ? step : undefined,
        label: requireXmlString(props, 'label', ctx, 'NumberInput'),
        units: typeof units === 'string' ? units : undefined,
        value: binding.value,
        width: typeof width === 'string' || typeof width === 'number' ? width : undefined,
        status: resolveInputStatus(props, ctx),
        htmlName: typeof htmlName === 'string' ? htmlName : undefined,
        isDisabled: typeof isDisabled === 'boolean' ? isDisabled : undefined,
        isOptional: typeof isOptional === 'boolean' ? isOptional : undefined,
        isRequired: typeof isRequired === 'boolean' ? isRequired : undefined,
        description: typeof description === 'string' ? description : undefined,
        placeholder: typeof placeholder === 'string' ? placeholder : undefined,
        autoComplete: typeof autoComplete === 'string' ? autoComplete : undefined,
        hasAutoFocus: typeof hasAutoFocus === 'boolean' ? hasAutoFocus : undefined,
        labelTooltip: typeof labelTooltip === 'string' ? labelTooltip : undefined,
        isIntegerOnly: typeof isIntegerOnly === 'boolean' ? isIntegerOnly : undefined,
        isLabelHidden: typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined,
        statusVariant: inputStatusVariant,
        disabledMessage: typeof disabledMessage === 'string' ? disabledMessage : undefined,
    };

    // Astryx uses a discriminated callback type for clearable fields.
    if (hasClear) {
        return <AstryxNumberInput {...common} hasClear onChange={binding.setValue} />;
    }

    return <AstryxNumberInput {...common} onChange={binding.setValue} />;
}
