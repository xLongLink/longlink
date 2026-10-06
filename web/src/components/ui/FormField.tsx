import type { FieldProps } from './types';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useState, type ReactNode, type RefObject } from 'react';

/** Connects themed controls to native submission and reports missing or invalid named values. */
export function FormField({
    children,
    fieldRef,
    values,
    serialize,
    error: fieldError,
    name,
    required,
    isRequired,
    disabled,
    isDisabled,
}: FieldProps & {
    children: ReactNode;
    fieldRef: RefObject<HTMLElement | null>;
    values: (string | Blob)[];
    serialize?: boolean;
    error?: string;
}) {
    // Keep validation feedback separate from the control's editable value.
    const [failure, setFailure] = useState<{ values: (string | Blob)[]; message: string }>();
    const unavailable = disabled ?? isDisabled;
    const error =
        fieldError ??
        ((required ?? isRequired) && !values.some((value) => typeof value !== 'string' || value !== '')
            ? 'Please complete this field.'
            : undefined);

    // Join the actual ancestor form, preserving ordinary FormData and canceled reset behavior.
    useEffect(() => {
        const form = fieldRef.current?.closest('form');
        if (!form || !name) return;
        const validate = (event: Event) => {
            const invalidControl = fieldRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
            if (unavailable || fieldRef.current?.closest('fieldset:disabled') || (!error && !invalidControl)) {
                setFailure(undefined);
                return;
            }
            setFailure({ values, message: error ?? 'Please enter a valid value.' });
            if (!event.defaultPrevented) {
                (
                    invalidControl ??
                    fieldRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, button')
                )?.focus();
            }
            event.preventDefault();
        };
        const collect = (event: FormDataEvent) => {
            if (!serialize || unavailable || fieldRef.current?.closest('fieldset:disabled')) return;
            for (const value of values) {
                if (typeof value !== 'string') event.formData.append(name, value);
            }
        };
        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (!event.defaultPrevented) setFailure(undefined);
            });
        };
        form.addEventListener('submit', validate, true);
        form.addEventListener('formdata', collect);
        form.addEventListener('reset', reset);
        return () => {
            form.removeEventListener('submit', validate, true);
            form.removeEventListener('formdata', collect);
            form.removeEventListener('reset', reset);
        };
    }, [fieldRef, name, values, serialize, unavailable, error]);

    // Leave control presentation to Astryx and expose submission errors accessibly.
    return (
        <Stack ref={fieldRef} gap={2}>
            {children}
            {serialize &&
                name &&
                values.map(
                    (value, index) =>
                        typeof value === 'string' && (
                            // eslint-disable-next-line react/no-array-index-key -- Hidden carriers represent ordered slots, including identical range endpoints.
                            <input key={index} type="hidden" name={name} value={value} disabled={unavailable} />
                        )
                )}
            {failure &&
                !unavailable &&
                failure.values.length === values.length &&
                failure.values.every((value, index) => value === values[index]) && (
                    <Text role="alert">{failure.message}</Text>
                )}
        </Stack>
    );
}
