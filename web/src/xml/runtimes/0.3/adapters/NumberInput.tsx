import { NumberInput as AstryxNumberInput } from '@astryxdesign/core-0-3/NumberInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    requireXmlString,
    resolveXmlNumber,
    resolveXmlSizeValue,
    resolveXmlStatus,
    resolveXmlString,
} from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx numeric field with numeric Valtio writes. */
export function NumberInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => (value == null ? null : Number(value)));
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
        label: requireXmlString(props, 'label', ctx, 'NumberInput'),
        max: resolveXmlNumber(props, 'max', ctx),
        min: resolveXmlNumber(props, 'min', ctx),
        placeholder: resolveXmlString(props, 'placeholder', ctx) || undefined,
        size,
        status: resolveXmlStatus(props, ctx),
        step: resolveXmlNumber(props, 'step', ctx),
        units: resolveXmlString(props, 'units', ctx) || undefined,
        value: binding.value,
        width: resolveXmlSizeValue(props, 'width', ctx),
    };

    // Astryx uses a discriminated callback type for clearable fields.
    if (hasClear) {
        return <AstryxNumberInput {...common} hasClear onChange={binding.setValue} />;
    }

    return <AstryxNumberInput {...common} onChange={binding.setValue} />;
}
