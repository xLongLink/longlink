import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';
import { useState } from 'react';
import { setXmlBinding, useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlNumber,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx numeric field with numeric Valtio writes. */
export function NumberInput({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState<number | null>(
        binding.initialValue == null ? null : Number(binding.initialValue)
    );
    const currentValue = binding.currentValue == null ? null : Number(binding.currentValue);
    const value = binding.bound ? currentValue : localValue;
    const hasClear = resolveXmlBoolean(props, 'hasClear', ctx, false);
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'md', 'NumberInput');
    const common = {
        autoComplete: resolveXmlString(props, 'autoComplete', ctx) || undefined,
        description: resolveXmlString(props, 'description', ctx) || undefined,
        disabledMessage: resolveXmlString(props, 'disabledMessage', ctx) || undefined,
        htmlName: resolveXmlString(props, 'htmlName', ctx) || undefined,
        isDisabled: resolveXmlBoolean(props, 'isDisabled', ctx, false),
        isIntegerOnly: resolveXmlBoolean(props, 'isIntegerOnly', ctx, false),
        isLabelHidden: resolveXmlBoolean(props, 'isLabelHidden', ctx, false),
        isOptional: resolveXmlBoolean(props, 'isOptional', ctx, false),
        isRequired: resolveXmlBoolean(props, 'isRequired', ctx, false),
        label: resolveXmlLabel(props, ctx, services, 'NumberInput'),
        max: resolveXmlNumber(props, 'max', ctx),
        min: resolveXmlNumber(props, 'min', ctx),
        placeholder: resolveXmlString(props, 'placeholder', ctx) || undefined,
        size,
        status: resolveXmlStatus(props, ctx),
        step: resolveXmlNumber(props, 'step', ctx),
        units: resolveXmlString(props, 'units', ctx) || undefined,
        value,
        width: resolveXmlSizeValue(props, 'width', ctx),
    };

    /** Writes a valid numeric value to bound or local state. */
    function setValue(nextValue: number | null) {
        setXmlBinding(binding, setLocalValue, nextValue);
    }

    // Astryx uses a discriminated callback type for clearable fields.
    if (hasClear) {
        return <AstryxNumberInput {...common} hasClear onChange={setValue} />;
    }

    return <AstryxNumberInput {...common} onChange={setValue} />;
}
