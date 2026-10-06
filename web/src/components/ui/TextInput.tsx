import { useValue } from './value';
import type { ReactNode } from 'react';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';

type TextInputProps = FieldProps & {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'password' | 'email';
    size?: 'sm' | 'md' | 'lg';
    htmlName?: string;
    autoComplete?: string;
    isReadOnly?: boolean;
    hasClear?: boolean;
    hasAutoFocus?: boolean;
    startIcon?: ReactNode;
    onEnter?: () => void;
};

/** Edits themed text with optional local state and native form serialization. */
export function TextInput(props: TextInputProps) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Let the wrapper own state only when the Solution does not provide a value.
    const { defaultValue, ...control } = props;
    const field = useValue(props.value, defaultValue ?? '', props.onChange);

    // Use ordinary editable text without clearing controls or automatic focus.
    return (
        <FormField {...props} fieldRef={field.ref} values={[field.value]}>
            <AstryxTextInput
                {...control}
                value={field.value}
                onChange={field.onChange}
                htmlName={props.name ?? props.htmlName}
                type={props.type ?? 'text'}
                size={size}
                isReadOnly={props.readOnly ?? props.isReadOnly ?? false}
                hasClear={props.hasClear ?? false}
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
