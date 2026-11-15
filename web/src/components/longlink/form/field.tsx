import type { FieldProps } from './fields';
import * as field from '@/components/shadcn/field';
import { useEffect, useRef, useState, Fragment, type ReactNode } from 'react';

/** Owns consistent field layout while the caller owns validation and form state. */
export function FieldFrame({
    id,
    label,
    description,
    error,
    disabled,
    form,
    horizontal = false,
    group = false,
    children
}: FieldProps & {
    id: string;
    disabled?: boolean;
    form?: string;
    horizontal?: boolean;
    group?: boolean;
    children: ReactNode;
}) {
    const root = useRef<HTMLDivElement | null>(null);
    const [reset, setReset] = useState(0);

    // Restore primitive state as well as DOM carriers after an uncanceled native reset.
    useEffect(() => {
        const owner = root.current?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            'input, textarea, select'
        );
        const formElement = form
            ? root.current?.ownerDocument.getElementById(form)
            : (owner?.form ?? root.current?.closest('form'));
        let mounted = true;
        const onReset = (event: Event) => {
            queueMicrotask(() => {
                if (mounted && !event.defaultPrevented) setReset((value) => value + 1);
            });
        };

        formElement?.addEventListener('reset', onReset);
        return () => {
            mounted = false;
            formElement?.removeEventListener('reset', onReset);
        };
    }, [form]);

    const feedback = (
        <>
            {description && <field.FieldDescription id={`${id}-description`}>{description}</field.FieldDescription>}
            {error && <field.FieldError id={`${id}-error`}>{error}</field.FieldError>}
        </>
    );
    const heading = label ? (
        group ? (
            <field.FieldTitle id={`${id}-label`}>{label}</field.FieldTitle>
        ) : (
            <field.FieldLabel id={`${id}-label`} htmlFor={id}>
                {label}
            </field.FieldLabel>
        )
    ) : null;

    return (
        <field.Field
            ref={root}
            orientation={horizontal ? 'horizontal' : 'vertical'}
            data-disabled={disabled}
            data-invalid={!!error}
        >
            <Fragment key={reset}>
                {horizontal ? (
                    <>
                        {children}
                        {(heading || description || error) && (
                            <field.FieldContent>
                                {heading}
                                {feedback}
                            </field.FieldContent>
                        )}
                    </>
                ) : (
                    <>
                        {heading}
                        {children}
                        {feedback}
                    </>
                )}
            </Fragment>
        </field.Field>
    );
}
