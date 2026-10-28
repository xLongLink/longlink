import { useValue } from './value';
import type { ReactNode } from 'react';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';

type TextInputProps = FieldProps & {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    /** Maximum Unicode code points, matching Python string length. Validates without truncating input. */
    maxLength?: number;
    type?: 'text' | 'password' | 'email';
    autoComplete?: string;
    startIcon?: ReactNode;
    onEnter?: () => void;
};

/** Edits themed text with optional local state and native form serialization. Required fields cannot be blank. */
export function TextInput(props: TextInputProps) {
    // Let the wrapper own state only when the Solution does not provide a value.
    const { defaultValue, maxLength, ...control } = props;

    const field = useValue(props.value, defaultValue ?? '', props.onChange);

    // Validate nonblank text and Python-compatible lengths without changing the submitted value.
    return (
        <FormField
            {...props}
            fieldRef={field.ref}
            values={[field.value]}
            error={
                props.required && !field.value.trim()
                    ? 'Please complete this field.'
                    : maxLength !== undefined && Array.from(field.value).length > maxLength
                      ? `Use no more than ${maxLength} characters.`
                      : undefined
            }
        >
            <AstryxTextInput
                {...control}
                width="100%"
                value={field.value}
                onChange={field.onChange}
                htmlName={props.name}
                type={props.type ?? 'text'}
                isReadOnly={false}
                hasClear
                size="md"
                hasAutoFocus={false}
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}
