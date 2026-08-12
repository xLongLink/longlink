import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core-0-3/CheckboxInput';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

const CHECKBOX_SIZES = ['sm', 'md'] as const;

/** Renders an Astryx checkbox with boolean Valtio binding. */
export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const size = resolveXml(props, 'size', ctx);
    const width = resolveXml(props, 'width', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isReadOnly = resolveXml(props, 'isReadOnly', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const description = resolveXml(props, 'description', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);

    if (size != null && !isXmlEnum(size, CHECKBOX_SIZES)) {
        throw new Error(`Unsupported CheckboxInput size '${String(size)}'`);
    }

    return (
        <AstryxCheckboxInput
            size={size}
            label={requireXmlString(props, 'label', ctx, 'CheckboxInput')}
            value={binding.value}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
            status={resolveInputStatus(props, ctx)}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            onChange={binding.setValue}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isReadOnly={isXmlBoolean(isReadOnly) ? isReadOnly : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            description={isXmlString(description) ? description : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
        />
    );
}
