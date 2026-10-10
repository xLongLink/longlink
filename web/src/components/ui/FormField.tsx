import type { FieldProps } from './types';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useEffect, useState, type ReactNode, type RefObject } from 'react';

/** Shares a scoped validation pass between Form and its non-native controls. */
export type FormValidation = { scope: HTMLElement; step?: number; invalid: HTMLElement[] };

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
    hidden,
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

    // Join the actual ancestor form, preserving ordinary FormData and canceled reset behavior.
    useEffect(() => {
        const form = fieldRef.current?.closest('form');

        if (!form || !name) return;

        const validate = (event: Event) => {
            // Stepped forms validate explicitly, without running inactive field listeners on submit.
            if (event.type === 'submit' && form.hasAttribute('data-form-steps')) return;

            // SAFETY: Form dispatches this private event with the shared FormValidation contract.
            const validation =
                event.type === 'longlink:validate' ? (event as CustomEvent<FormValidation>).detail : null;

            const field = fieldRef.current;

            if (validation && (!field || !validation.scope.contains(field))) return;

            const panel = field?.closest<HTMLElement>('[data-form-step]');

            if (validation?.step !== undefined && panel && Number(panel.dataset.formStep) !== validation.step) return;

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
        };

        const collect = (event: FormDataEvent) => {
            if (disabled || fieldRef.current?.closest('fieldset:disabled')) return;

            for (const value of values) {
                if (value instanceof Blob) event.formData.append(name, value);
            }
        };

        const reset = (event: Event) => {
            queueMicrotask(() => {
                if (!event.defaultPrevented) setFailure(undefined);
            });
        };

        // Only serialized binary values need a collector; strings use native controls or hidden carriers.
        const collectFiles = serialize && values.some((value) => value instanceof Blob);
        form.addEventListener('submit', validate, true);
        form.addEventListener('longlink:validate', validate);

        if (collectFiles) form.addEventListener('formdata', collect);
        form.addEventListener('reset', reset);

        return () => {
            form.removeEventListener('submit', validate, true);
            form.removeEventListener('longlink:validate', validate);

            if (collectFiles) form.removeEventListener('formdata', collect);
            form.removeEventListener('reset', reset);
        };
    }, [fieldRef, name, values, serialize, disabled, error]);

    // Leave control presentation to Astryx and expose submission errors accessibly.
    return (
        <Stack ref={fieldRef} gap={2} hidden={hidden} className={hidden ? 'hidden!' : undefined}>
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
