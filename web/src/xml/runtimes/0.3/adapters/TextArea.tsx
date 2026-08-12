import { TextArea as AstryxTextArea } from '@astryxdesign/core-0-3/TextArea';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

const FIELD_STATUS_VARIANTS = ['attached', 'detached', 'tooltip'] as const;
const TEXT_AREA_SIZES = ['sm', 'md', 'lg'] as const;

/** Renders an accessible Astryx text area with optional Valtio binding. */
export function TextArea({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const size = resolveXml(props, 'size', ctx);
    const rows = resolveXml(props, 'rows', ctx);
    const label = requireXmlString(props, 'label', ctx, 'TextArea');
    const width = resolveXml(props, 'width', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const maxLength = resolveXml(props, 'maxLength', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const hasAutoFocus = resolveXml(props, 'hasAutoFocus', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const hasSpellCheck = resolveXml(props, 'hasSpellCheck', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);

    if (size != null && !isXmlEnum(size, TEXT_AREA_SIZES)) {
        throw new Error(`Unsupported TextArea size '${String(size)}'`);
    }

    if (statusVariant != null && !isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)) {
        throw new Error(`Unsupported TextArea statusVariant '${String(statusVariant)}'`);
    }

    if (maxLength != null && (!isXmlNumber(maxLength) || !Number.isInteger(maxLength) || maxLength < 0)) {
        throw new Error('TextArea maxLength must be a non-negative integer');
    }

    if (rows != null && (!isXmlNumber(rows) || !Number.isInteger(rows) || rows <= 0)) {
        throw new Error('TextArea rows must be a positive integer');
    }

    return (
        <AstryxTextArea
            size={size}
            rows={isXmlNumber(rows) ? rows : undefined}
            label={label}
            value={binding.value}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            maxLength={isXmlNumber(maxLength) ? maxLength : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            description={isXmlString(description) ? description : undefined}
            placeholder={isXmlString(placeholder) ? placeholder : undefined}
            hasAutoFocus={isXmlBoolean(hasAutoFocus) ? hasAutoFocus : undefined}
            labelTooltip={isXmlString(labelTooltip) ? labelTooltip : undefined}
            hasSpellCheck={isXmlBoolean(hasSpellCheck) ? hasSpellCheck : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            statusVariant={statusVariant}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
        />
    );
}
