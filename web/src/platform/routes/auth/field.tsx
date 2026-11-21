import { Input } from '@/components/shadcn/input';
import { useId, type ComponentProps } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/shadcn/field';

type TextFieldProps = ComponentProps<typeof Input> & {
    label: string;
    error?: string;
    description?: string;
    labelHidden?: boolean;
};

/** Connects an auth form string field to its native control and validation feedback. */
export function TextField({ label, error, description, labelHidden, id: providedId, ...props }: TextFieldProps) {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    return (
        <Field
            className="min-w-0"
            data-disabled={props.disabled || undefined}
            data-invalid={Boolean(error) || props['aria-invalid']}
        >
            <FieldLabel id={`${id}-label`} htmlFor={id} className={labelHidden ? 'sr-only' : undefined}>
                {label}
            </FieldLabel>
            {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
            <Input
                {...props}
                id={id}
                aria-required={props.required || undefined}
                aria-labelledby={`${id}-label`}
                aria-describedby={
                    [props['aria-describedby'], description && `${id}-description`, error && `${id}-error`]
                        .filter(Boolean)
                        .join(' ') || undefined
                }
                aria-invalid={Boolean(error) || props['aria-invalid']}
            />
            {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </Field>
    );
}
