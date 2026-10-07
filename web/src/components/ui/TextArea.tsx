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
    hasAutoFocus?: boolean;
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
                htmlName={props.name}
                rows={props.rows ?? 3}
                isReadOnly={false}
                hasSpellCheck
                hasAutoFocus={props.hasAutoFocus ?? false}
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                changeAction={undefined}
                isLoading={false}
            />
        </FormField>
    );
}
