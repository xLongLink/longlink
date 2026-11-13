import type { ComponentPropsWithoutRef } from 'react';
import { NativeTextInput } from '@/components/custom/NativeTextInput';
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form';

type TextFieldProps<Values extends FieldValues> = Omit<
    ComponentPropsWithoutRef<typeof NativeTextInput>,
    'name' | 'onBlur' | 'onChange' | 'error' | 'value'
> & { control: Control<Values>; name: FieldPathByValue<Values, string> };

/** Connects an auth form string field to its native control and validation feedback. */
export function TextField<Values extends FieldValues>({ control, name, ...props }: TextFieldProps<Values>) {
    // Keep form ownership of the input value, focus ref, events, and validation status.
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <NativeTextInput
                    {...props}
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    value={field.value}
                />
            )}
        />
    );
}
