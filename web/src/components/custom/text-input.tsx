import { X } from 'lucide-react';
import { useValue } from './value';
import { FormField } from './form-field';
import type { FieldProps } from './types';
import { useId, useRef, type ReactNode } from 'react';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/shadcn/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';

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

/** Custom form adapter with string callbacks, clear/reset, and Unicode code-point validation. */
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
                        {props.description && (
                            <FieldDescription id={descriptionId}>{props.description}</FieldDescription>
                        )}
                    </FieldContent>
                </FieldLabel>
                <InputGroup className={props.disabled ? 'opacity-50' : undefined}>
                    <InputGroupInput
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
                    {props.startIcon && <InputGroupAddon aria-hidden="true">{props.startIcon}</InputGroupAddon>}
                    {field.value !== '' && !props.disabled && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label={`Clear ${props.label}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    field.onChange('');
                                    input.current?.focus({ preventScroll: true });
                                }}
                            >
                                <X aria-hidden="true" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    )}
                </InputGroup>
            </Field>
        </FormField>
    );
}
