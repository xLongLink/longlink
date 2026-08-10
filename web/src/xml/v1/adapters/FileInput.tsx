import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';
import { useState } from 'react';
import { useXmlContext } from '../core/context';
import type { Props } from '../types';
import { setXmlBinding, useBindableValue } from './binding';
import {
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlLabel,
    resolveXmlNumber,
    resolveOptionalXmlString,
    resolveXmlSizeValue,
    resolveXmlStatus,
} from './props';

/** Renders an Astryx file field while keeping File values available to FormData actions. */
export function FileInput({ props }: Props) {
    const ctx = useXmlContext();
    const binding = useBindableValue(props, 'value', ctx, 'file');
    const [localValue, setLocalValue] = useState<File | File[] | null>(null);
    const boundValue =
        binding.currentValue == null
            ? null
            : typeof File !== 'undefined' &&
                (binding.currentValue instanceof File ||
                    (Array.isArray(binding.currentValue) &&
                        binding.currentValue.every((entry) => entry instanceof File)))
              ? binding.currentValue
              : null;
    const value = binding.bound ? boundValue : localValue;

    return (
        <AstryxFileInput
            accept={resolveOptionalXmlString(props, 'accept', ctx)}
            description={resolveOptionalXmlString(props, 'description', ctx)}
            disabledMessage={resolveOptionalXmlString(props, 'disabledMessage', ctx)}
            isDisabled={resolveXmlBoolean(props, 'isDisabled', ctx, false)}
            isLabelHidden={resolveXmlBoolean(props, 'isLabelHidden', ctx, false)}
            isLoading={resolveXmlBoolean(props, 'isLoading', ctx, false)}
            isMultiple={resolveXmlBoolean(props, 'isMultiple', ctx, false)}
            isOptional={resolveXmlBoolean(props, 'isOptional', ctx, false)}
            isRequired={resolveXmlBoolean(props, 'isRequired', ctx, false)}
            label={resolveXmlLabel(props, ctx, 'FileInput')}
            maxFiles={resolveXmlNumber(props, 'maxFiles', ctx)}
            maxSize={resolveXmlNumber(props, 'maxSize', ctx)}
            mode={resolveXmlEnum(props, 'mode', ctx, ['dropzone', 'input'], 'input', 'FileInput')}
            onChange={(nextValue) => {
                setXmlBinding(binding, setLocalValue, nextValue);
            }}
            placeholder={resolveOptionalXmlString(props, 'placeholder', ctx)}
            status={resolveXmlStatus(props, ctx)}
            value={value}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        />
    );
}
