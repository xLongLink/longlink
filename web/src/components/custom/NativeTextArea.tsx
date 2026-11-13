import { useId } from 'react';
import type { FieldProps } from './types';
import { LoaderCircle } from 'lucide-react';
import { Textarea } from '@/components/shadcn/textarea';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/shadcn/field';

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
        <Field data-disabled={props.disabled || undefined}>
            <FieldLabel htmlFor={id}>
                <FieldContent>
                    <span id={`${id}-label`} className="flex items-center gap-2">
                        {props.label}
                        {props.required && (
                            <span className="text-muted-foreground font-normal">
                                <span aria-hidden="true"> · </span>Required
                            </span>
                        )}
                    </span>
                    {props.description && <FieldDescription id={descriptionId}>{props.description}</FieldDescription>}
                </FieldContent>
            </FieldLabel>
            <div className={props.disabled ? 'relative opacity-50' : 'relative'}>
                <Textarea
                    className={props.loading ? 'resize-y pe-8' : 'resize-y'}
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
                {props.loading && (
                    <LoaderCircle
                        className="pointer-events-none absolute top-2 end-2 size-3.5 animate-spin text-muted-foreground motion-reduce:animate-none"
                        aria-hidden="true"
                    />
                )}
            </div>
            <span role="status" className="sr-only">
                {props.loading ? 'Loading' : ''}
            </span>
        </Field>
    );
}
