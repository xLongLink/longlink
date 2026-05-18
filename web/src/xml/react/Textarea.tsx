import { Textarea as UITextarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { getVersion, useSnapshot } from 'valtio';

/** Props accepted by the XML Textarea component. */
export interface TextareaProps {
    cols?: number | string;
    disabled?: boolean;
    id?: string;
    label?: string;
    placeholder?: string | number | boolean;
    rows?: number | string;
    value?: string | number | boolean | Record<string, unknown>;
}

/** Renders a shadcn-backed textarea with optional reactive state binding. */
export function Textarea({ cols, disabled, id, label, placeholder, rows, value = '' }: TextareaProps) {
    const placeholderText = String(placeholder ?? label ?? '');
    // Normalize XML string attributes to the numeric textarea props expected by React.
    const resolvedCols = typeof cols === 'string' ? Number(cols) : cols;
    const resolvedRows = typeof rows === 'string' ? Number(rows) : rows;

    if (value && typeof value === 'object' && getVersion(value) !== undefined) {
        const state = value as Record<string, unknown> & { value?: unknown };
        const snapshot = useSnapshot(state);
        const currentValue = 'value' in snapshot ? snapshot.value : snapshot;

        return (
            <UITextarea
                cols={Number.isNaN(resolvedCols ?? Number.NaN) ? undefined : resolvedCols}
                disabled={disabled}
                id={id}
                placeholder={placeholderText}
                rows={Number.isNaN(resolvedRows ?? Number.NaN) ? undefined : resolvedRows}
                value={String(currentValue ?? '')}
                onChange={(event) => {
                    if ('value' in state) {
                        state.value = event.target.value;
                    }
                }}
            />
        );
    }

    const [initialValue] = useState(String(value ?? ''));

    return (
        <UITextarea
            cols={Number.isNaN(resolvedCols ?? Number.NaN) ? undefined : resolvedCols}
            disabled={disabled}
            id={id}
            placeholder={placeholderText}
            rows={Number.isNaN(resolvedRows ?? Number.NaN) ? undefined : resolvedRows}
            defaultValue={initialValue}
        />
    );
}
