import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';

type TextAreaProps = FieldProps & {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    rows?: number;
    /** Maximum Unicode code points, matching Python string length. Validates without truncating input. */
    maxLength?: number;
    autoComplete?: string;
};

/** Edits themed multi-line text with native form serialization. Required fields cannot be blank. */
export function TextArea(props: TextAreaProps) {
    // Keep optional editing state local while retaining the actual themed textarea.
    const { defaultValue, maxLength, ...control } = props;
    const field = useValue(props.value, defaultValue ?? '', props.onChange);

    // Validate Python-compatible lengths without Astryx's grapheme counter or native UTF-16 limits.
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
            <AstryxTextArea
                {...control}
                width="100%"
                value={field.value}
                onChange={field.onChange}
                htmlName={props.name}
                rows={props.rows ?? 3}
                isReadOnly={false}
                hasSpellCheck
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
