import type { FieldProps } from './fields';
import * as field from '@/components/shadcn/field';
import { useEffect, useId, useRef, useState, Fragment, type ReactNode, type Ref } from 'react';

type ControlAttributes = Required<Pick<FieldProps, 'id'>> & Omit<FieldProps, 'id' | 'label' | 'description' | 'error'>;

type FieldLayoutProps = {
    field: FieldProps;
    disabled?: boolean;
    horizontal?: boolean;
    group?: boolean;
    children: (attributes: ControlAttributes) => ReactNode;
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
            {(attributes) => <Fragment key={reset}>{children(attributes)}</Fragment>}
        </FieldLayout>
    );
}

/** Owns field presentation without changing the control's lifecycle. */
export function FieldLayout({
    field: props,
    disabled,
    ref,
    horizontal = false,
    group = false,
    children
}: FieldLayoutProps & { ref?: Ref<HTMLDivElement> }) {
    const generatedId = useId();
    const { label, description, error } = props;
    const id = props.id ?? generatedId;
    const attributes: ControlAttributes = {
        id,
        'aria-label': props['aria-label'],
        'aria-labelledby': props['aria-labelledby'] ?? (label ? `${id}-label` : undefined),
        'aria-describedby':
            [
                props['aria-describedby'],
                description ? `${id}-description` : undefined,
                error ? `${id}-error` : undefined
            ]
                .filter(Boolean)
                .join(' ') || undefined,
        'aria-invalid': error ? true : props['aria-invalid']
    };
    const control = children(attributes);
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
                    {control}
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
                    {control}
                    {feedback}
                </>
            )}
        </field.Field>
    );
}
