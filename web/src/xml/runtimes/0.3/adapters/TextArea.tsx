import { TextArea as AstryxTextArea } from '@astryxdesign/core-0-3/TextArea';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders an accessible Astryx text area with optional Valtio binding. */
export function TextArea({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const sizeValue = resolveXml(props, 'size', ctx);
    const size = isXmlEnum(sizeValue, ['sm', 'md', 'lg']) ? sizeValue : 'md';

    return (
        <AstryxTextArea
            description={(() => { const value = resolveXml(props, 'description', ctx); return isXmlString(value) ? value : undefined; })()}
            disabledMessage={(() => { const value = resolveXml(props, 'disabledMessage', ctx); return isXmlString(value) ? value : undefined; })()}
            hasAutoFocus={(() => { const value = resolveXml(props, 'hasAutoFocus', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            hasSpellCheck={(() => { const value = resolveXml(props, 'hasSpellCheck', ctx); return isXmlBoolean(value) ? value : true; })()}
            htmlName={(() => { const value = resolveXml(props, 'htmlName', ctx); return isXmlString(value) ? value : undefined; })()}
            isDisabled={(() => { const value = resolveXml(props, 'isDisabled', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isLabelHidden={(() => { const value = resolveXml(props, 'isLabelHidden', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isOptional={(() => { const value = resolveXml(props, 'isOptional', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isRequired={(() => { const value = resolveXml(props, 'isRequired', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            label={requireXmlString(props, 'label', ctx, 'TextArea')}
            maxLength={(() => { const value = resolveXml(props, 'maxLength', ctx); return isXmlNumber(value) ? value : undefined; })()}
            onChange={binding.setValue}
            placeholder={(() => { const value = resolveXml(props, 'placeholder', ctx); return isXmlString(value) ? value : undefined; })()}
            rows={(() => { const value = resolveXml(props, 'rows', ctx); return isXmlNumber(value) ? value : 3; })()}
            size={size}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={(() => { const value = resolveXml(props, 'width', ctx); return isXmlString(value) || isXmlNumber(value) ? value : undefined; })()}
        />
    );
}
