import { FieldLabel } from './FieldLabel';
import { Input } from '@/components/shadcn/input';
import { useId, type ComponentProps } from 'react';

/** Edits trusted Platform fields without joining the isolated View form protocol. */
export function NativeTextInput({
    label,
    description,
    labelHidden,
    error,
    id: providedId,
    required,
    ...props
}: ComponentProps<typeof Input> & {
    label: string;
    description?: string;
    labelHidden?: boolean;
    error?: string;
}) {
    // Keep labels, descriptions, and validation feedback attached to the same native control.
    const generatedId = useId();
    const id = providedId ?? generatedId;

    const describedBy = [props['aria-describedby'], description && `${id}-description`, error && `${id}-error`]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="flex w-full min-w-0 flex-col gap-1">
            <div className={labelHidden ? 'sr-only' : undefined}>
                <FieldLabel controlId={id} label={label} description={description} required={required} />
            </div>
            <Input
                {...props}
                id={id}
                required={required}
                aria-required={required || undefined}
                aria-labelledby={`${id}-label`}
                aria-describedby={describedBy || undefined}
                aria-invalid={error ? true : props['aria-invalid']}
            />
            {error && (
                <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
