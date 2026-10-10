import { useValue } from './value';
import type { ReactNode } from 'react';
import type { FieldProps } from './types';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';

type TextInputProps = FieldProps & {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'password' | 'email';
    size?: 'sm' | 'md' | 'lg';
    autoComplete?: string;
    hasClear?: boolean;
    hasAutoFocus?: boolean;
    startIcon?: ReactNode;
    onEnter?: () => void;
};

/** Edits themed text with optional local state and native form serialization. */
export function TextInput(props: TextInputProps) {
    // Let the wrapper own state only when the Solution does not provide a value.
    const { defaultValue, ...control } = props;

    const { ref, value, onChange } = useValue<string, HTMLInputElement>(
        props.value,
        defaultValue ?? '',
        props.onChange
    );

    // Use ordinary editable text without clearing controls or automatic focus.
    return (
        <Stack gap={0} hidden={props.hidden} className={props.hidden ? 'hidden!' : 'contents!'}>
            <AstryxTextInput
                {...control}
                ref={ref}
                value={value}
                onChange={onChange}
                htmlName={props.name}
                type={props.type ?? 'text'}
                isReadOnly={false}
                hasClear={props.hasClear ?? false}
                hasAutoFocus={props.hasAutoFocus ?? false}
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                changeAction={undefined}
                isLoading={false}
            />
        </Stack>
    );
}
