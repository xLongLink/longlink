import { TextArea as AstryxTextArea } from '@astryxdesign/core-0-3/TextArea';
import { useBindableValue } from '../core/binding';
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

/** Renders an accessible Astryx text area with optional Valtio binding. */
export function TextArea({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
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
            label={resolveXmlLabel(props, ctx, services, 'TextArea')}
            maxLength={resolveXmlNumber(props, 'maxLength', ctx)}
            onChange={binding.setValue}
            placeholder={resolveXmlString(props, 'placeholder', ctx) || undefined}
            rows={resolveXmlNumber(props, 'rows', ctx, 3)}
            size={size}
            status={resolveXmlStatus(props, ctx)}
            value={binding.value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
