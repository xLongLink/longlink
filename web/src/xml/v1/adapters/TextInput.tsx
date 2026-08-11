import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';
import { useState } from 'react';
import { useXmlContext } from '../core/context';
import type { Props } from '../types';
import { setXmlBinding, useBindableValue } from '../core/binding';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';

/** Renders an accessible Astryx text input with optional Valtio binding. */
export function TextInput({ props }: Props) {
    const ctx = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState(String(binding.initialValue ?? ''));
    const value = binding.bound ? String(binding.currentValue ?? '') : localValue;
    const label = resolveXmlLabel(props, ctx, 'TextInput');
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
            onChange={(nextValue) => {
                setXmlBinding(binding, setLocalValue, nextValue);
            }}
            placeholder={resolveXmlString(props, 'placeholder', ctx) || undefined}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            type={type}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
