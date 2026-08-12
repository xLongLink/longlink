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
    const label = requireXmlString(props, 'label', ctx, 'TextArea');
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const hasAutoFocus = resolveXml(props, 'hasAutoFocus', ctx);
    const hasSpellCheck = resolveXml(props, 'hasSpellCheck', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const labelTooltip = resolveXml(props, 'labelTooltip', ctx);
    const maxLength = resolveXml(props, 'maxLength', ctx);
    const placeholder = resolveXml(props, 'placeholder', ctx);
    const rows = resolveXml(props, 'rows', ctx);
    const statusVariant = resolveXml(props, 'statusVariant', ctx);
    const width = resolveXml(props, 'width', ctx);

    if (size != null && !isXmlEnum(size, TEXT_AREA_SIZES)) throw new Error(`Unsupported TextArea size '${String(size)}'`);
    if (statusVariant != null && !isXmlEnum(statusVariant, FIELD_STATUS_VARIANTS)) throw new Error(`Unsupported TextArea statusVariant '${String(statusVariant)}'`);
    if (maxLength != null && (!isXmlNumber(maxLength) || !Number.isInteger(maxLength) || maxLength < 0)) throw new Error('TextArea maxLength must be a non-negative integer');
    if (rows != null && (!isXmlNumber(rows) || !Number.isInteger(rows) || rows <= 0)) throw new Error('TextArea rows must be a positive integer');

    return (
        <AstryxTextArea
            size={size}
            label={label}
            rows={isXmlNumber(rows) ? rows : undefined}
            value={binding.value}
            description={isXmlString(description) ? description : undefined}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
            hasAutoFocus={isXmlBoolean(hasAutoFocus) ? hasAutoFocus : undefined}
            hasSpellCheck={isXmlBoolean(hasSpellCheck) ? hasSpellCheck : undefined}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            labelTooltip={isXmlString(labelTooltip) ? labelTooltip : undefined}
            maxLength={isXmlNumber(maxLength) ? maxLength : undefined}
            onChange={binding.setValue}
            placeholder={isXmlString(placeholder) ? placeholder : undefined}
            status={resolveInputStatus(props, ctx)}
            statusVariant={statusVariant}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        />
    );
}
