import type { ReactNode } from 'react';
import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';

type TextInputProps = FieldProps & {
    value: string;
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

/** Edits controlled text without a second async change channel. */
export function TextInput(props: TextInputProps) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Use ordinary editable text without clearing controls or automatic focus.
    return (
        <AstryxTextInput
            {...props}
            type={props.type ?? 'text'}
            size={size}
            isReadOnly={props.isReadOnly ?? false}
            hasClear={props.hasClear ?? false}
            hasAutoFocus={props.hasAutoFocus ?? false}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
