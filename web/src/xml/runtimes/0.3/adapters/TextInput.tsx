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
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const hasAutoFocus = resolveXml(props, 'hasAutoFocus', ctx);
    const hasClear = resolveXml(props, 'hasClear', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const width = resolveXml(props, 'width', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);

    if (type != null && !isXmlEnum(type, TEXT_INPUT_TYPES)) throw new Error(`Unsupported TextInput type '${String(type)}'`);
    if (size != null && !isXmlEnum(size, TEXT_INPUT_SIZES)) throw new Error(`Unsupported TextInput size '${String(size)}'`);
    if (statusVariant != null && !isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)) throw new Error(`Unsupported TextInput statusVariant '${String(statusVariant)}'`);

    return (
        <AstryxTextInput
            type={type}
            size={size}
            label={label}
            value={binding.value}
            description={isXmlString(description) ? description : undefined}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
            hasAutoFocus={isXmlBoolean(hasAutoFocus) ? hasAutoFocus : undefined}
            hasClear={isXmlBoolean(hasClear) ? hasClear : undefined}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            labelTooltip={isXmlString(labelTooltip) ? labelTooltip : undefined}
            onChange={binding.setValue}
            placeholder={isXmlString(placeholder) ? placeholder : undefined}
            status={resolveInputStatus(props, ctx)}
            statusVariant={statusVariant}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        />
    );
}
