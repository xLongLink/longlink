import { X } from 'lucide-react';
import { useValue } from './value';
import { FormField } from './FormField';
import { FieldLabel } from './FieldLabel';
import type { FieldProps } from './types';
import { Button } from '@base-ui/react/button';
import { Input } from '@/components/shadcn/input';
import { useId, useRef, type ReactNode } from 'react';

type TextInputProps = FieldProps & {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    /** Maximum Unicode code points, matching Python string length. Validates without truncating input. */
    maxLength?: number;
    type?: 'text' | 'password' | 'email';
    autoComplete?: string;
    startIcon?: ReactNode;
    onEnter?: () => void;
};

/** Edits themed text with optional local state and native form serialization. Required fields cannot be blank. */
export function TextInput(props: TextInputProps) {
    // Let the wrapper own state only when the Solution does not provide a value.
    const field = useValue(props.value, props.defaultValue ?? '', props.onChange);
    const input = useRef<HTMLInputElement>(null);
    const id = useId();
    const descriptionId = `${id}-description`;

    // Validate nonblank text and Python-compatible lengths without changing the submitted value.
    return (
        <FormField
            {...props}
            fieldRef={field.ref}
            values={[field.value]}
            error={
                props.required && !field.value.trim()
                    ? 'Please complete this field.'
                    : props.maxLength !== undefined && Array.from(field.value).length > props.maxLength
                      ? `Use no more than ${props.maxLength} characters.`
                      : undefined
            }
        >
            <div className="view-text-field" data-disabled={props.disabled || undefined}>
                <FieldLabel
                    controlId={id}
                    label={props.label}
                    description={props.description}
                    required={props.required}
                />
                <div
                    className="view-text-input"
                    onClick={() => {
                        // Icons and padding activate the editable control without moving the page.
                        if (!props.disabled) input.current?.focus({ preventScroll: true });
                    }}
                >
                    {props.startIcon && (
                        <span className="view-text-input-icon" aria-hidden="true">
                            {props.startIcon}
                        </span>
                    )}
                    <Input
                        variant="view"
                        ref={input}
                        id={id}
                        name={props.disabled ? undefined : props.name}
                        value={field.value}
                        onChange={(event) => {
                            if (!props.disabled) field.onChange(event.target.value);
                        }}
                        placeholder={props.placeholder}
                        type={props.type ?? 'text'}
                        autoComplete={props.autoComplete}
                        aria-disabled={props.disabled || undefined}
                        readOnly={props.disabled || undefined}
                        aria-required={props.required || undefined}
                        aria-labelledby={`${id}-label`}
                        aria-describedby={props.description ? descriptionId : undefined}
                        onKeyDown={(event) => {
                            // Disabled fields remain discoverable but cannot submit through Enter.
                            if (props.disabled) {
                                if (event.key === 'Enter') event.preventDefault();

                                return;
                            }

                            // Committing an IME candidate is not an authored Enter action.
                            if (
                                event.key === 'Enter' &&
                                !event.nativeEvent.isComposing &&
                                event.nativeEvent.keyCode !== 229
                            ) {
                                props.onEnter?.();
                            }
                        }}
                    />
                    {field.value !== '' && !props.disabled && (
                        <Button
                            className="view-text-input-clear"
                            type="button"
                            aria-label={`Clear ${props.label}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                field.onChange('');
                                input.current?.focus({ preventScroll: true });
                            }}
                        >
                            <X aria-hidden="true" />
                        </Button>
                    )}
                </div>
            </div>
        </FormField>
    );
}
