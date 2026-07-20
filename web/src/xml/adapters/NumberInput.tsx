import { useState } from 'react';
import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';
import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { useBindableValue } from './binding';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlNumber,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from './props';

/** Renders an Astryx numeric field with numeric Valtio writes. */
export function NumberInput({ props }: Props) {
    const { ctx } = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx, 'number');
    const initialValue = binding.initialValue == null ? null : Number(binding.initialValue);
    const [localValue, setLocalValue] = useState<number | null>(initialValue);
    const currentValue = binding.currentValue == null ? null : Number(binding.currentValue);
    const value = binding.bound ? currentValue : localValue;
    const hasClear = resolveXmlBoolean(props, 'hasClear', ctx, false) === true;
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
        label: resolveXmlLabel(props, ctx, 'NumberInput'),
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
        if (binding.bound) binding.setValue(nextValue);
        else setLocalValue(nextValue);
    }

    // Astryx uses a discriminated callback type for clearable fields.
    if (hasClear) {
        return <AstryxNumberInput {...common} hasClear onChange={setValue} />;
    }

    return <AstryxNumberInput {...common} onChange={setValue} />;
}
