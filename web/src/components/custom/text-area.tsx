import { useValue } from './value';
import { FormField } from './form-field';
import type { FieldProps } from './types';
import { NativeTextArea } from './native-text-area';

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

/** Custom form adapter with string callbacks, reset, and Unicode code-point validation. */
export function TextArea(props: TextAreaProps) {
    // Keep optional editing state local while retaining native form reset behavior.
    const { maxLength } = props;
    const field = useValue(props.value, props.defaultValue ?? '', props.onChange);

    // Validate Python-compatible lengths without truncating the submitted value.
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
            <NativeTextArea
                label={props.label}
                description={props.description}
                name={props.name}
                required={props.required}
                disabled={props.disabled}
                value={field.value}
                onChange={field.onChange}
                placeholder={props.placeholder}
                rows={props.rows}
                autoComplete={props.autoComplete}
            />
        </FormField>
    );
}
