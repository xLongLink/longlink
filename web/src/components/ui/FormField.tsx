import type { FieldProps } from './types';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { createContext, useEffect, useEffectEvent, useState, type ReactNode, type RefObject } from 'react';

/** Shares a scoped validation pass between Form and its non-native controls. */
export type FormValidation = { scope: HTMLElement; panel?: HTMLElement; invalid: HTMLElement[] };

// Form exposes validation without owning the navigation of its descendants.
export const FormValidationContext = createContext<((panel?: HTMLElement) => boolean) | null>(null);

/** Connects themed controls to native submission and reports missing or invalid named values. */
export function FormField({
    children,
    fieldRef,
    values,
    serialize,
    error: fieldError,
    name,
    required,
    disabled,
}: FieldProps & {
    children: ReactNode;
    fieldRef: RefObject<HTMLElement | null>;
    values: (string | Blob)[];
    serialize?: boolean;
    error?: string;
}) {
    // Keep validation feedback separate from the control's editable value.
    const [failure, setFailure] = useState<{ values: (string | Blob)[]; message: string }>();

    const error =
        fieldError ??
        (required && !values.some((value) => value instanceof Blob || value !== '')
            ? 'Please complete this field.'
            : undefined);

    // Read current validation state without reconnecting form listeners while editing.
    const validate = useEffectEvent((form: HTMLFormElement, event: Event) => {
        // Managed forms run one ordered validation pass for native and themed controls.
        if (event.type === 'submit' && form.hasAttribute('data-longlink-form')) return;

        // SAFETY: Form dispatches this private event with the shared FormValidation contract.
        const validation = event.type === 'longlink:validate' ? (event as CustomEvent<FormValidation>).detail : null;

        const field = fieldRef.current;

        if (validation && (!field || !validation.scope.contains(field))) return;

        const panel = field?.closest<HTMLElement>('[data-step-panel]');

        if (validation?.panel && panel && panel !== validation.panel) return;

        const invalidControl = fieldRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');

        if (disabled || fieldRef.current?.closest('fieldset:disabled') || (!error && !invalidControl)) {
            setFailure(undefined);

            return;
        }

        setFailure({ values, message: error ?? 'Please enter a valid value.' });

        // The wizard reveals invalid panels before focusing; ordinary forms retain native submit handling.
        const control =
            invalidControl ?? field?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, button');

        if (validation && field) validation.invalid.push(control ?? field);
        else if (!event.defaultPrevented) control?.focus();

        event.preventDefault();
    });

    // Only serialized binary values need a collector; strings use native controls or hidden carriers.
    const collect = useEffectEvent((event: FormDataEvent) => {
        if (!serialize || !name || disabled || fieldRef.current?.closest('fieldset:disabled')) return;

        for (const value of values) {
            if (value instanceof Blob) event.formData.append(name, value);
        }
    });

    // Join the actual ancestor form, preserving ordinary FormData and canceled reset behavior.
    useEffect(() => {
        const form = fieldRef.current?.closest('form');

        if (!form || !name) return;

        const onValidate = (event: Event) => validate(form, event);
        const onCollect = (event: FormDataEvent) => collect(event);

        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (!event.defaultPrevented) setFailure(undefined);
            });
        };

        form.addEventListener('submit', onValidate, true);
        form.addEventListener('longlink:validate', onValidate);
        form.addEventListener('formdata', onCollect);
        form.addEventListener('reset', reset);

        return () => {
            form.removeEventListener('submit', onValidate, true);
            form.removeEventListener('longlink:validate', onValidate);
            form.removeEventListener('formdata', onCollect);
            form.removeEventListener('reset', reset);
        };
    }, [fieldRef, name]);

    // Leave control presentation to Astryx and expose submission errors accessibly.
    return (
        <Stack ref={fieldRef} gap={2} width="100%">
            {children}
            {serialize &&
                name &&
                values.map(
                    (value, index) =>
                        !(value instanceof Blob) && (
                            // eslint-disable-next-line react/no-array-index-key -- Hidden carriers represent ordered slots, including identical range endpoints.
                            <input key={index} type="hidden" name={name} value={value} disabled={disabled} />
                        )
                )}
            {failure &&
                !disabled &&
                failure.values.length === values.length &&
                failure.values.every((value, index) => value === values[index]) && (
                    <Text role="alert">{failure.message}</Text>
                )}
        </Stack>
    );
}
