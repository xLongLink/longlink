import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core-0-3/CheckboxInput';
import { toXmlBoolean, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    requireXmlString,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx checkbox with boolean Valtio binding. */
export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, toXmlBoolean);
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md'], 'CheckboxInput') ?? 'md';

    return (
        <AstryxCheckboxInput
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx)}
            isReadOnly={resolveXmlBoolean(props, 'isReadOnly', ctx)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx)}
            label={requireXmlString(props, 'label', ctx, 'CheckboxInput')}
            onChange={binding.setValue}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            value={binding.value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
