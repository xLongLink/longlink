import { FileInput as AstryxFileInput } from '@astryxdesign/core-0-3/FileInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, requireXmlString, resolveXml } from '../core/props';
import { resolveInputStatus } from './input';
import type { Props } from '../types';

/** Renders an Astryx file field while keeping File values available to FormData actions. */
export function FileInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(
        props,
        'value',
        ctx,
        (value): File | File[] | null =>
            value == null ||
            typeof File === 'undefined' ||
            (!(value instanceof File) && !(Array.isArray(value) && value.every((entry) => entry instanceof File)))
                ? null
                : value,
        'file',
        () => null
    );

    return (
        <AstryxFileInput
            accept={(() => { const value = resolveXml(props, 'accept', ctx); return isXmlString(value) ? value : undefined; })()}
            description={(() => { const value = resolveXml(props, 'description', ctx); return isXmlString(value) ? value : undefined; })()}
            disabledMessage={(() => { const value = resolveXml(props, 'disabledMessage', ctx); return isXmlString(value) ? value : undefined; })()}
            isDisabled={(() => { const value = resolveXml(props, 'isDisabled', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isLabelHidden={(() => { const value = resolveXml(props, 'isLabelHidden', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isLoading={(() => { const value = resolveXml(props, 'isLoading', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isMultiple={(() => { const value = resolveXml(props, 'isMultiple', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isOptional={(() => { const value = resolveXml(props, 'isOptional', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            isRequired={(() => { const value = resolveXml(props, 'isRequired', ctx); return isXmlBoolean(value) ? value : undefined; })()}
            label={requireXmlString(props, 'label', ctx, 'FileInput')}
            maxFiles={(() => { const value = resolveXml(props, 'maxFiles', ctx); return isXmlNumber(value) ? value : undefined; })()}
            maxSize={(() => { const value = resolveXml(props, 'maxSize', ctx); return isXmlNumber(value) ? value : undefined; })()}
            mode={(() => { const value = resolveXml(props, 'mode', ctx); return isXmlEnum(value, ['input', 'dropzone']) ? value : 'input'; })()}
            onChange={binding.setValue}
            placeholder={(() => { const value = resolveXml(props, 'placeholder', ctx); return isXmlString(value) ? value : undefined; })()}
            status={resolveInputStatus(props, ctx)}
            value={binding.value}
            width={(() => { const value = resolveXml(props, 'width', ctx); return isXmlString(value) || isXmlNumber(value) ? value : undefined; })()}
        />
    );
}
