import { Input } from '@/components/shadcn/input';
import { useId, type ComponentPropsWithoutRef } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form';

type TextFieldProps<Values extends FieldValues> = Omit<
    ComponentPropsWithoutRef<typeof Input>,
    'name' | 'onBlur' | 'onChange' | 'value'
> & {
    control: Control<Values>;
    name: FieldPathByValue<Values, string>;
    label: string;
    description?: string;
    labelHidden?: boolean;
};

/** Connects an auth form string field to its native control and validation feedback. */
export function TextField<Values extends FieldValues>({
    control,
    name,
    label,
    description,
    labelHidden,
    id: providedId,
    ...props
}: TextFieldProps<Values>) {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    // Keep form ownership of the input value, focus ref, events, and validation status.
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <Field
                    className="min-w-0"
                    data-disabled={props.disabled || undefined}
                    data-invalid={fieldState.invalid || props['aria-invalid']}
                >
                    <FieldLabel id={`${id}-label`} htmlFor={id} className={labelHidden ? 'sr-only' : undefined}>
                        {label}
                    </FieldLabel>
                    {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
                    <Input
                        {...props}
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        value={field.value}
                        id={id}
                        aria-required={props.required || undefined}
                        aria-labelledby={`${id}-label`}
                        aria-describedby={
                            [
                                props['aria-describedby'],
                                description && `${id}-description`,
                                fieldState.error?.message && `${id}-error`
                            ]
                                .filter(Boolean)
                                .join(' ') || undefined
                        }
                        aria-invalid={fieldState.invalid || props['aria-invalid']}
                    />
                    {fieldState.error?.message && (
                        <FieldError id={`${id}-error`}>{fieldState.error.message}</FieldError>
                    )}
                </Field>
            )}
        />
    );
}
