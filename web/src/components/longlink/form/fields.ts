import { useId, type AriaAttributes } from 'react';

export type FieldProps = Pick<
    AriaAttributes,
    'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid'
> & { id?: string; label?: string; description?: string; error?: string };

export type FormOption = { value: string; label: string; disabled?: boolean };

/** Associates caller-owned validation feedback without replacing external accessible descriptions. */
export function useField(props: FieldProps) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    const describedBy =
        [
            props['aria-describedby'],
            props.description ? `${id}-description` : undefined,
            props.error ? `${id}-error` : undefined
        ]
            .filter(Boolean)
            .join(' ') || undefined;

    return {
        id,
        'aria-label': props['aria-label'],
        'aria-labelledby': props['aria-labelledby'] ?? (props.label ? `${id}-label` : undefined),
        'aria-describedby': describedBy,
        'aria-invalid': props.error ? true : props['aria-invalid']
    };
}
