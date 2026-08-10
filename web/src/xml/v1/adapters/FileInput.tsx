import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';
import { useState } from 'react';
import { useXmlContext } from '../core/context';
import type { Props } from '../types';
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

type FileValue = File | File[] | null;

/** Renders an Astryx file field while keeping File values available to FormData actions. */
export function FileInput({ props }: Props) {
    const ctx = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx, 'file');
    const [localValue, setLocalValue] = useState<FileValue>(null);
    const currentValue = binding.currentValue;
    const boundValue =
        currentValue == null ||
        (typeof File !== 'undefined' &&
            (currentValue instanceof File ||
                (Array.isArray(currentValue) && currentValue.every((entry) => entry instanceof File))))
            ? (currentValue ?? null)
            : null;
    const value = binding.bound ? boundValue : localValue;
    const mode = resolveXmlEnum(props, 'mode', ctx, ['dropzone', 'input'], 'input', 'FileInput');

    return (
        <AstryxFileInput
            accept={resolveXmlString(props, 'accept', ctx) || undefined}
            description={resolveXmlString(props, 'description', ctx) || undefined}
            disabledMessage={resolveXmlString(props, 'disabledMessage', ctx) || undefined}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isLoading={resolveXmlBoolean(props, 'isLoading', ctx, false)}
            isMultiple={resolveXmlBoolean(props, 'isMultiple', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
            label={resolveXmlLabel(props, ctx, 'FileInput')}
            maxFiles={resolveXmlNumber(props, 'maxFiles', ctx)}
            maxSize={resolveXmlNumber(props, 'maxSize', ctx)}
            mode={mode}
            onChange={(nextValue) => {
                if (binding.bound) binding.setValue(nextValue);
                else setLocalValue(nextValue);
            }}
            placeholder={resolveXmlString(props, 'placeholder', ctx) || undefined}
            status={resolveXmlStatus(props, ctx)}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
