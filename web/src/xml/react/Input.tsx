import { Input as UIInput } from '@ui/input';
import { useState } from 'react';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML Input component. */
export interface InputProps {
    'aria-invalid'?: boolean;
    autoComplete?: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    label?: string;
    placeholder?: string | number | boolean;
    value?: string | number | boolean | Record<string, unknown>;
    type?: string;
}

/** Renders a minimal XML input control. */
export function Input({ 'aria-invalid': ariaInvalid, autoComplete, className, disabled, id, value = '', label, placeholder, type = 'text' }: InputProps) {
    const placeholderText = String(placeholder ?? label ?? '');

    if (value && typeof value === 'object' && getVersion(value) !== undefined) {
        const state = value as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(state);
        const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UIInput
                aria-invalid={ariaInvalid}
                autoComplete={autoComplete}
                className={className}
                disabled={disabled}
                id={id}
                type={type}
                placeholder={placeholderText}
                value={String(currentValue ?? '')}
                onChange={(event) => {
                    const nextValue = type === 'number' ? Number(event.target.value) : event.target.value;

                    if ('value' in state) {
                        state.value = nextValue;
                    }
                }}
            />
        );
    }

    const [initialValue] = useState(String(value ?? ''));

    return <UIInput aria-invalid={ariaInvalid} autoComplete={autoComplete} className={className} disabled={disabled} id={id} type={type} placeholder={placeholderText} defaultValue={initialValue} />;
}
