import { Input as UIInput } from '@/ui/input';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML Input component. */
export interface InputProps {
    placeholder?: string | number | boolean;
    value?: string | number | boolean;
    type?: string;
}

/** Renders a minimal XML input control. */
export const Input: ComponentType<InputProps> = ({ value: rawValue, placeholder, type = 'text' }) => {
    const placeholderText = String(placeholder ?? '');

    if (rawValue && typeof rawValue === 'object' && getVersion(rawValue) !== undefined) {
        const value = rawValue as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(value);
        const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UIInput
                type={type}
                placeholder={placeholderText}
                value={String(currentValue ?? '')}
                onChange={(event) => {
                    const nextValue = type === 'number' ? Number(event.target.value) : event.target.value;

                    if ('value' in value) {
                        value.value = nextValue;
                    }
                }}
            />
        );
    }

    const [initialValue] = useState(String(rawValue ?? ''));

    return <UIInput type={type} placeholder={placeholderText} defaultValue={initialValue} />;
};
