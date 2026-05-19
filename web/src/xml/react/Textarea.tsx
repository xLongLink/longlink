import { Textarea as UITextarea } from '@/components/ui/textarea';
import type { XmlBindableValue } from '@xml/types';

import { useBindableValue } from './binding';

/** Props accepted by the XML Textarea component. */
export interface TextareaProps {
    cols?: number | string;
    disabled?: boolean;
    id?: string;
    label?: string;
    placeholder?: string | number | boolean;
    rows?: number | string;
    value?: XmlBindableValue;
}

/** Renders a shadcn-backed textarea with optional reactive state binding. */
export function Textarea({ cols, disabled, id, label, placeholder, rows, value = '' }: TextareaProps) {
    const placeholderText = String(placeholder ?? label ?? '');
    // Normalize XML string attributes to the numeric textarea props expected by React.
    const resolvedCols = typeof cols === 'string' ? Number(cols) : cols;
    const resolvedRows = typeof rows === 'string' ? Number(rows) : rows;
    const binding = useBindableValue(value);

    if (binding.bound) {
        return (
            <UITextarea
                cols={Number.isNaN(resolvedCols ?? Number.NaN) ? undefined : resolvedCols}
                disabled={disabled}
                id={id}
                placeholder={placeholderText}
                rows={Number.isNaN(resolvedRows ?? Number.NaN) ? undefined : resolvedRows}
                value={binding.currentValue}
                onChange={(event) => {
                    binding.setValue(event.target.value);
                }}
            />
        );
    }

    return (
        <UITextarea
            cols={Number.isNaN(resolvedCols ?? Number.NaN) ? undefined : resolvedCols}
            disabled={disabled}
            id={id}
            placeholder={placeholderText}
            rows={Number.isNaN(resolvedRows ?? Number.NaN) ? undefined : resolvedRows}
            defaultValue={binding.initialValue}
        />
    );
}
