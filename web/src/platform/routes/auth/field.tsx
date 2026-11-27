import { Input } from '@/components/shadcn/input';
import { useId, type ComponentProps } from 'react';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';

type TextFieldProps = ComponentProps<typeof Input> & { label: string; error?: string; labelHidden?: boolean };

/** Connects an auth form string field to its native control and validation feedback. */
export function TextField({ label, error, labelHidden, ...props }: TextFieldProps) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    const invalid = error ? true : props['aria-invalid'];
    const describedBy =
        [props['aria-describedby'], error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined;

    return (
        <Field className="min-w-0" data-disabled={props.disabled || undefined} data-invalid={invalid}>
            <FieldLabel id={`${id}-label`} htmlFor={id} className={labelHidden ? 'sr-only' : undefined}>
                {label}
            </FieldLabel>
            <Input
                {...props}
                id={id}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                aria-required={props.required || undefined}
                aria-labelledby={`${id}-label`}
            />
            {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </Field>
    );
}
