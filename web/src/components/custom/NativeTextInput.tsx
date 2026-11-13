import { Input } from '@/components/shadcn/input';
import { useId, type ComponentProps } from 'react';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/shadcn/field';

/** Edits trusted Platform fields without joining the isolated View form protocol. */
export function NativeTextInput({
    label,
    description,
    labelHidden,
    error,
    id: providedId,
    required,
    ...props
}: ComponentProps<typeof Input> & { label: string; description?: string; labelHidden?: boolean; error?: string }) {
    // Keep labels, descriptions, and validation feedback attached to the same native control.
    const generatedId = useId();
    const id = providedId ?? generatedId;

    const describedBy = [props['aria-describedby'], description && `${id}-description`, error && `${id}-error`]
        .filter(Boolean)
        .join(' ');

    return (
        <Field
            className="min-w-0"
            data-disabled={props.disabled || undefined}
            data-invalid={error ? true : props['aria-invalid']}
        >
            <FieldLabel htmlFor={id} className={labelHidden ? 'sr-only' : undefined}>
                <FieldContent>
                    <span id={`${id}-label`} className="flex items-center gap-2">
                        {label}
                        {required && (
                            <span className="text-muted-foreground font-normal">
                                <span aria-hidden="true"> · </span>Required
                            </span>
                        )}
                    </span>
                    {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
                </FieldContent>
            </FieldLabel>
            <Input
                {...props}
                id={id}
                required={required}
                aria-required={required || undefined}
                aria-labelledby={`${id}-label`}
                aria-describedby={describedBy || undefined}
                aria-invalid={error ? true : props['aria-invalid']}
            />
            {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </Field>
    );
}
