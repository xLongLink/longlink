import { TextArea as AstryxTextArea } from '@astryxdesign/core-0-3/TextArea';
import type { Props } from '../types';
import { resolveInputStatus } from './input';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { requireXmlString, resolveXml } from '../core/props';

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

    if (size != null && size !== 'sm' && size !== 'md' && size !== 'lg') {
        throw new Error(`Unsupported TextArea size '${String(size)}'`);
    }

    if (
        statusVariant != null &&
        statusVariant !== 'attached' &&
        statusVariant !== 'detached' &&
        statusVariant !== 'tooltip'
    ) {
        throw new Error(`Unsupported TextArea statusVariant '${String(statusVariant)}'`);
    }

    if (maxLength != null && (typeof maxLength !== 'number' || !Number.isInteger(maxLength) || maxLength < 0)) {
        throw new Error('TextArea maxLength must be a non-negative integer');
    }

    if (rows != null && (typeof rows !== 'number' || !Number.isInteger(rows) || rows <= 0)) {
        throw new Error('TextArea rows must be a positive integer');
    }

    return (
        <AstryxTextArea
            size={size}
            rows={typeof rows === 'number' ? rows : undefined}
            label={label}
            value={binding.value}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            htmlName={typeof htmlName === 'string' ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={typeof isLoading === 'boolean' ? isLoading : undefined}
            maxLength={typeof maxLength === 'number' ? maxLength : undefined}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isOptional={typeof isOptional === 'boolean' ? isOptional : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
            placeholder={typeof placeholder === 'string' ? placeholder : undefined}
            hasAutoFocus={typeof hasAutoFocus === 'boolean' ? hasAutoFocus : undefined}
            labelTooltip={typeof labelTooltip === 'string' ? labelTooltip : undefined}
            hasSpellCheck={typeof hasSpellCheck === 'boolean' ? hasSpellCheck : undefined}
            isLabelHidden={typeof isLabelHidden === 'boolean' ? isLabelHidden : undefined}
            statusVariant={statusVariant}
            disabledMessage={typeof disabledMessage === 'string' ? disabledMessage : undefined}
        />
    );
}
