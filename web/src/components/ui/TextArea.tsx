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
    maxLength?: number;
    isReadOnly?: boolean;
    hasAutoFocus?: boolean;
    htmlName?: string;
    autoComplete?: string;
};

/** Edits themed multi-line text with native form serialization. */
export function TextArea(props: TextAreaProps) {
    // Keep optional editing state local while retaining the actual themed textarea.
    const { defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue ?? '', props.onChange);

    // Always enable spell checking and default to three editable rows with no focus stealing.
    return (
        <FormField {...props} fieldRef={field.ref} values={[field.value]}>
            <AstryxTextArea
                {...control}
                value={field.value}
                onChange={field.onChange}
                htmlName={props.name ?? props.htmlName}
                rows={props.rows ?? 3}
                isReadOnly={props.readOnly ?? props.isReadOnly ?? false}
                hasSpellCheck
                hasAutoFocus={props.hasAutoFocus ?? false}
                isLabelHidden={false}
                isRequired={props.required ?? props.isRequired ?? false}
                isDisabled={props.disabled ?? props.isDisabled ?? false}
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}
