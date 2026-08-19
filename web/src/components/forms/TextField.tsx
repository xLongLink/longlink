import { TextInput } from '@astryxdesign/core/TextInput';
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form';

type TextFieldProps<TValues extends FieldValues> = {
    control: Control<TValues>;
    label: string;
    name: FieldPathByValue<TValues, string>;
    placeholder?: string;
    type?: 'email' | 'password' | 'text';
};

/** Connects a required text input to a string React Hook Form field. */
export function TextField<TValues extends FieldValues>({
    control,
    label,
    name,
    placeholder,
    type,
}: TextFieldProps<TValues>) {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field }) => (
                <TextInput
                    ref={field.ref}
                    label={label}
                    value={field.value}
                    htmlName={field.name}
                    isRequired
                    placeholder={placeholder}
                    type={type}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                />
            )}
        />
    );
}
