import { useId } from 'react';
import { FieldLabel } from './FieldLabel';
import type { FieldProps } from './types';
import { LoaderCircle } from 'lucide-react';

/** Renders the shared textarea surface with trusted native-only editing options. */
export function NativeTextArea(
    props: FieldProps & {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        rows?: number;
        autoComplete?: string;
        spellCheck?: boolean;
        loading?: boolean;
    }
) {
    // Associate visible field text without including descriptions in the accessible name.
    const id = useId();
    const descriptionId = `${id}-description`;

    // Disabled controls remain focusable and omit their value without altering sensitive content.
    return (
        <div className="view-text-field" data-disabled={props.disabled || undefined}>
            <FieldLabel controlId={id} label={props.label} description={props.description} required={props.required} />
            <div className="view-text-input view-textarea" data-loading={props.loading || undefined}>
                <textarea
                    className="view-text-input-control"
                    id={id}
                    name={props.disabled ? undefined : props.name}
                    value={props.value}
                    onChange={(event) => {
                        if (!props.disabled) props.onChange(event.target.value);
                    }}
                    placeholder={props.placeholder}
                    rows={props.rows ?? 3}
                    autoComplete={props.autoComplete}
                    spellCheck={props.spellCheck ?? true}
                    readOnly={props.disabled || undefined}
                    aria-disabled={props.disabled || undefined}
                    aria-required={props.required || undefined}
                    aria-labelledby={`${id}-label`}
                    aria-busy={props.loading || undefined}
                    aria-describedby={props.description ? descriptionId : undefined}
                />
                {props.loading && <LoaderCircle className="view-textarea-spinner" aria-hidden="true" />}
            </div>
            <span role="status" className="sr-only">
                {props.loading ? 'Loading' : ''}
            </span>
        </div>
    );
}
