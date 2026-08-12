import { TextInput as AstryxTextInput } from '@astryxdesign/core-0-3/TextInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders an accessible Astryx text input with optional Valtio binding. */
export function TextInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const label = requireXmlString(props, 'label', ctx, 'TextInput');
    const typeValue = resolveXml(props, 'type', ctx);
    const sizeValue = resolveXml(props, 'size', ctx);
    const type = isXmlEnum(typeValue, ['text', 'password', 'email']) ? typeValue : 'text';
    const size = isXmlEnum(sizeValue, ['sm', 'md', 'lg']) ? sizeValue : 'md';
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const hasAutoFocus = resolveXml(props, 'hasAutoFocus', ctx);
    const hasClear = resolveXml(props, 'hasClear', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const width = resolveXml(props, 'width', ctx);

    return (
        <AstryxTextInput
            description={isXmlString(description) ? description : undefined}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
            hasAutoFocus={isXmlBoolean(hasAutoFocus) ? hasAutoFocus : undefined}
            hasClear={isXmlBoolean(hasClear) ? hasClear : undefined}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            label={label}
            labelTooltip={isXmlString(labelTooltip) ? labelTooltip : undefined}
            onChange={binding.setValue}
            placeholder={isXmlString(placeholder) ? placeholder : undefined}
            size={size}
            status={resolveInputStatus(props, ctx)}
            type={type}
            value={binding.value}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        />
    );
}
