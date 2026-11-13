import { cn } from 'cn';
import { useValue } from './value';
import type { FieldProps } from './types';
import { useId, type ReactNode } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/shadcn/field';

/** Selects one of a small number of labeled values. */
export function RadioList(
    props: FieldProps & {
        children?: ReactNode;
        value?: string;
        defaultValue?: string;
        onChange?: (value: string) => void;
        orientation?: 'vertical' | 'horizontal';
    }
) {
    // Keep local resets and caller-owned empty values separate.
    const { ref, value, onChange } = useValue(
        'value' in props ? (props.value ?? '') : undefined,
        props.defaultValue ?? '',
        props.onChange
    );

    const id = useId();

    // Read-only disabled groups remain discoverable without becoming successful form controls.
    return (
        <Field ref={ref} data-disabled={props.disabled || undefined}>
            <FieldContent>
                <FieldTitle id={`${id}-label`}>
                    {props.label}
                    {props.required && (
                        <span className="text-muted-foreground font-normal">
                            <span aria-hidden="true"> · </span>Required
                        </span>
                    )}
                </FieldTitle>
                {props.description && <FieldDescription id={`${id}-description`}>{props.description}</FieldDescription>}
            </FieldContent>
            <RadioGroup
                className={cn(
                    props.orientation === 'horizontal' && 'flex flex-row flex-wrap gap-4',
                    props.disabled && 'opacity-50'
                )}
                value={value}
                onValueChange={onChange}
                name={props.disabled ? undefined : props.name}
                required={props.required && !props.disabled}
                readOnly={props.disabled}
                aria-disabled={props.disabled || undefined}
                aria-labelledby={`${id}-label`}
                aria-describedby={props.description ? `${id}-description` : undefined}
                aria-orientation={props.orientation ?? 'vertical'}
            >
                {props.children}
            </RadioGroup>
        </Field>
    );
}

/** Defines one option using the surrounding RadioList's selection context. */
export function RadioListItem(props: {
    /** Visible label identifying this choice. */
    label: string;
    /** Value passed to the surrounding RadioList when selected. */
    value: string;
    /** Optional helper text explaining the choice. */
    description?: string;
    isDisabled?: boolean;
}) {
    const id = useId();

    // The entire label activates one control; helper text describes rather than names it.
    return (
        <Field orientation="horizontal" data-disabled={props.isDisabled || undefined}>
            <RadioGroupItem
                id={id}
                render={<button type="button" />}
                nativeButton
                value={props.value}
                disabled={props.isDisabled}
                aria-labelledby={`${id}-label`}
                aria-describedby={props.description ? `${id}-description` : undefined}
            />
            <FieldLabel htmlFor={id} className="flex-1">
                <FieldContent>
                    <span id={`${id}-label`}>{props.label}</span>
                    {props.description && (
                        <FieldDescription id={`${id}-description`}>{props.description}</FieldDescription>
                    )}
                </FieldContent>
            </FieldLabel>
        </Field>
    );
}
