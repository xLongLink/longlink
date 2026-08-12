import { TextInput as AstryxTextInput } from '@astryxdesign/core-0-3/TextInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an accessible Astryx text input with optional Valtio binding. */
export function TextInput({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const label = resolveXmlLabel(props, ctx, services, 'TextInput');
    const type = resolveXmlEnum(props, 'type', ctx, ['text', 'password', 'email'], 'text', 'TextInput');
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'md', 'TextInput');

    return (
        <AstryxTextInput
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            hasAutoFocus={resolveXmlBoolean(props, 'hasAutoFocus', ctx, false)}
            hasClear={resolveXmlBoolean(props, 'hasClear', ctx, false)}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
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
