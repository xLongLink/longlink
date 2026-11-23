import type { ComponentProps } from 'react';
import { Input } from '@/components/shadcn/input';
import { useField } from '@/components/longlink/form/fields';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';

type TextFieldProps = ComponentProps<typeof Input> & { label: string; error?: string; labelHidden?: boolean };

/** Connects an auth form string field to its native control and validation feedback. */
export function TextField({ label, error, labelHidden, ...props }: TextFieldProps) {
    const field = useField({ ...props, label, error });
    const { id } = field;

    return (
        <Field className="min-w-0" data-disabled={props.disabled || undefined} data-invalid={field['aria-invalid']}>
            <FieldLabel id={`${id}-label`} htmlFor={id} className={labelHidden ? 'sr-only' : undefined}>
                {label}
            </FieldLabel>
            <Input {...props} {...field} aria-required={props.required || undefined} aria-labelledby={`${id}-label`} />
            {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </Field>
    );
}
