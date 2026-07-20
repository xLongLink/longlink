import { useState } from 'react';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';
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

/** Renders an accessible Astryx text area with optional Valtio binding. */
export function TextArea({ props }: Props) {
    const { ctx } = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx);
    const [localValue, setLocalValue] = useState(String(binding.initialValue ?? ''));
    const value = binding.bound ? String(binding.currentValue ?? '') : localValue;
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'md', 'TextArea');

    return (
        <AstryxTextArea
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            hasAutoFocus={resolveXmlBoolean(props, 'hasAutoFocus', ctx, false)}
            hasSpellCheck={resolveXmlBoolean(props, 'hasSpellCheck', ctx, true)}
            htmlName={resolveXmlString(props, 'htmlName', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
            label={resolveXmlLabel(props, ctx, 'TextArea')}
            maxLength={resolveXmlNumber(props, 'maxLength', ctx)}
            onChange={(nextValue) => {
                if (binding.bound) binding.setValue(nextValue);
                else setLocalValue(nextValue);
            }}
            placeholder={resolveXmlString(props, 'placeholder', ctx) || undefined}
            rows={resolveXmlNumber(props, 'rows', ctx, 3)}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
