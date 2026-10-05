import type { ReactNode } from 'react';
import type { FieldProps } from './types';
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
    return <AstryxTextInput {...props} changeAction={undefined} isLoading={false} />;
}
