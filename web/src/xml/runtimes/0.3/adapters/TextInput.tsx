import { TextInput as AstryxTextInput } from '@astryxdesign/core-0-3/TextInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

const FIELD_STATUS_VARIANTS = ['attached', 'detached', 'tooltip'] as const;
const TEXT_INPUT_SIZES = ['sm', 'md', 'lg'] as const;
const TEXT_INPUT_TYPES = ['text', 'password', 'email'] as const;

/** Renders an accessible Astryx text input with optional Valtio binding. */
export function TextInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const type = resolveXml(props, 'type', ctx);
    const size = resolveXml(props, 'size', ctx);
    const label = requireXmlString(props, 'label', ctx, 'TextInput');
    const width = resolveXml(props, 'width', ctx);
    const hasClear = resolveXml(props, 'hasClear', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const hasAutoFocus = resolveXml(props, 'hasAutoFocus', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);

    if (type != null && !isXmlEnum(type, TEXT_INPUT_TYPES)) {
        throw new Error(`Unsupported TextInput type '${String(type)}'`);
    }

    if (size != null && !isXmlEnum(size, TEXT_INPUT_SIZES)) {
        throw new Error(`Unsupported TextInput size '${String(size)}'`);
    }

    if (statusVariant != null && !isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)) {
        throw new Error(`Unsupported TextInput statusVariant '${String(statusVariant)}'`);
    }

    return (
        <AstryxTextInput
            type={type}
            size={size}
            label={label}
            value={binding.value}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            hasClear={isXmlBoolean(hasClear) ? hasClear : undefined}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            description={isXmlString(description) ? description : undefined}
            placeholder={isXmlString(placeholder) ? placeholder : undefined}
            hasAutoFocus={isXmlBoolean(hasAutoFocus) ? hasAutoFocus : undefined}
            labelTooltip={isXmlString(labelTooltip) ? labelTooltip : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            statusVariant={statusVariant}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
        />
    );
}
