import { Input as UIInput } from '@ui/input';
import type { XmlBindableValue } from '@xml/types';

import { useBindableValue } from './binding';

/** Props accepted by the XML Input component. */
export interface InputProps {
    'aria-invalid'?: boolean;
    autoComplete?: string;
    disabled?: boolean;
    id?: string;
    label?: string;
    placeholder?: string | number | boolean;
    value?: XmlBindableValue;
    type?: string;
}

/** Renders a minimal XML input control. */
export function Input({
    'aria-invalid': ariaInvalid,
    autoComplete,
    disabled,
    id,
    value = '',
    label,
    placeholder,
    type = 'text',
}: InputProps) {
    const placeholderText = String(placeholder ?? label ?? '');
    const binding = useBindableValue(value, type);

    if (binding.bound) {
        return (
            <UIInput
                aria-invalid={ariaInvalid}
                autoComplete={autoComplete}
                disabled={disabled}
                id={id}
                type={type}
                placeholder={placeholderText}
                value={binding.currentValue}
                onChange={(event) => {
                    binding.setValue(event.target.value);
                }}
            />
        );
    }

    return (
        <UIInput
            aria-invalid={ariaInvalid}
            autoComplete={autoComplete}
            disabled={disabled}
            id={id}
            type={type}
            placeholder={placeholderText}
            defaultValue={binding.initialValue}
        />
    );
}
