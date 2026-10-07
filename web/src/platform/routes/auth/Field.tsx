import type { ComponentPropsWithoutRef } from 'react';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form';

type TextFieldProps<Values extends FieldValues> = Omit<
    ComponentPropsWithoutRef<typeof TextInput>,
    'htmlName' | 'onBlur' | 'onChange' | 'status' | 'value'
> & {
    control: Control<Values>;
    name: FieldPathByValue<Values, string>;
};

/** Connects an auth form string field to Astryx's controlled input and validation status. */
export function TextField<Values extends FieldValues>({ control, name, ...props }: TextFieldProps<Values>) {
    // Keep form ownership of the input value, focus ref, events, and validation status.
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <TextInput
                    {...props}
                    ref={field.ref}
                    htmlName={field.name}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                    value={field.value}
                />
            )}
        />
    );
}
