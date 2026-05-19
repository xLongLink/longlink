import { Textarea as UITextarea } from '@/components/ui/textarea';
import { useXmlContext } from '../core/context';
import type { Props } from '../types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

import { useBindableValue } from './binding';

/** Props accepted by the XML Textarea component. */

/** Renders a shadcn-backed textarea with optional reactive state binding. */
export function Textarea({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const cols = resolveXmlString(props, 'cols', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const id = resolveXmlString(props, 'id', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const placeholder = resolveXmlValue(props, 'placeholder', ctx);
    const rows = resolveXmlString(props, 'rows', ctx);
    const value = resolveXmlValue(props, 'value', ctx);
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
