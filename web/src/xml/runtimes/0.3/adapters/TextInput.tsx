import { TextInput as AstryxTextInput } from '@astryxdesign/core-0-3/TextInput';
import { useBindableValue } from '../core/binding';
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

/** Renders an accessible Astryx text input with optional Valtio binding. */
export function TextInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const label = requireXmlString(props, 'label', ctx, 'TextInput');
    const type = resolveXmlEnum(props, 'type', ctx, ['text', 'password', 'email'], 'TextInput') ?? 'text';
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'TextInput') ?? 'md';

    return (
        <AstryxTextInput
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            hasAutoFocus={resolveXmlBoolean(props, 'hasAutoFocus', ctx)}
            hasClear={resolveXmlBoolean(props, 'hasClear', ctx)}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx)}
            label={label}
            labelTooltip={resolveXmlString(props, 'labelTooltip', ctx) || undefined}
            onChange={binding.setValue}
            placeholder={resolveXmlString(props, 'placeholder', ctx) || undefined}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            type={type}
            value={binding.value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
