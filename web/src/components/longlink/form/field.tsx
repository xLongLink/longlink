import type { FieldProps } from './fields';
import * as field from '@/components/shadcn/field';
import { useEffect, useRef, useState, Fragment, type ReactNode, type Ref } from 'react';

type FieldLayoutProps = Pick<FieldProps, 'label' | 'description' | 'error'> & {
    id: string;
    disabled?: boolean;
    horizontal?: boolean;
    group?: boolean;
    children: ReactNode;
};

/** Restores composite control state after an uncanceled form reset. */
export function FieldFrame({ form, children, ...props }: FieldLayoutProps & { form?: string }) {
    const root = useRef<HTMLDivElement | null>(null);
    const [reset, setReset] = useState(0);

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

    return (
        <FieldLayout {...props} ref={root}>
            <Fragment key={reset}>{children}</Fragment>
        </FieldLayout>
    );
}

/** Owns field presentation without changing the control's lifecycle. */
export function FieldLayout({
    id,
    label,
    description,
    error,
    disabled,
    ref,
    horizontal = false,
    group = false,
    children
}: FieldLayoutProps & { ref?: Ref<HTMLDivElement> }) {
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
            <field.FieldLabel
                id={`${id}-label`}
                htmlFor={id}
                className={
                    horizontal ? 'cursor-pointer group-data-[disabled=true]/field:cursor-not-allowed' : undefined
                }
            >
                {label}
            </field.FieldLabel>
        )
    ) : null;

    return (
        <field.Field
            ref={ref}
            orientation={horizontal ? 'horizontal' : 'vertical'}
            data-disabled={disabled}
            data-invalid={!!error}
        >
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
        </field.Field>
    );
}
