import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core-0-3/CheckboxInput';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders an Astryx checkbox with boolean Valtio binding. */
export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const sizeValue = resolveXml(props, 'size', ctx);
    const size = isXmlEnum(sizeValue, ['sm', 'md']) ? sizeValue : 'md';
    const description = resolveXml(props, 'description', ctx);
    const disabledMessage = resolveXml(props, 'disabledMessage', ctx);
    const htmlName = resolveXml(props, 'htmlName', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isLabelHidden = resolveXml(props, 'isLabelHidden', ctx);
    const isOptional = resolveXml(props, 'isOptional', ctx);
    const isReadOnly = resolveXml(props, 'isReadOnly', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
    const width = resolveXml(props, 'width', ctx);

    return (
        <AstryxCheckboxInput
            description={isXmlString(description) ? description : undefined}
            disabledMessage={isXmlString(disabledMessage) ? disabledMessage : undefined}
            htmlName={isXmlString(htmlName) ? htmlName : undefined}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isLabelHidden={isXmlBoolean(isLabelHidden) ? isLabelHidden : undefined}
            isOptional={isXmlBoolean(isOptional) ? isOptional : undefined}
            isReadOnly={isXmlBoolean(isReadOnly) ? isReadOnly : undefined}
            isRequired={isXmlBoolean(isRequired) ? isRequired : undefined}
            label={requireXmlString(props, 'label', ctx, 'CheckboxInput')}
            onChange={binding.setValue}
            size={size}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        />
    );
}
