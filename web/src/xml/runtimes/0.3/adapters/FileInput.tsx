import { FileInput as AstryxFileInput } from '@astryxdesign/core-0-3/FileInput';
import { useBindableValue } from '../core/binding';
import { useXmlRuntime } from '../core/context';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    requireXmlString,
    resolveXmlNumber,
    resolveXmlSizeValue,
    resolveXmlString,
    resolveXmlStatus,
} from '../core/props';
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
            accept={resolveXmlString(props, 'accept', ctx) || undefined}
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx)}
            isLoading={resolveXmlBoolean(props, 'isLoading', ctx)}
            isMultiple={resolveXmlBoolean(props, 'isMultiple', ctx)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx)}
            label={requireXmlString(props, 'label', ctx, 'FileInput')}
            maxFiles={resolveXmlNumber(props, 'maxFiles', ctx)}
            maxSize={resolveXmlNumber(props, 'maxSize', ctx)}
            mode={resolveXmlEnum(props, 'mode', ctx, ['dropzone', 'input'], 'FileInput') ?? 'input'}
            onChange={binding.setValue}
            placeholder={resolveXmlString(props, 'placeholder', ctx) || undefined}
            status={resolveXmlStatus(props, ctx)}
            value={binding.value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
