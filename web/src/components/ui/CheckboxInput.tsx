import { useValue } from './value';
import { Checkbox } from './Checkbox';
import { useId, useRef } from 'react';
import type { FieldProps } from './types';
import { Field, FieldLabel } from '@/components/shadcn/field';

/** Custom labeled adapter with mixed values, reset support, and focusable disabled controls. */
export function CheckboxInput(
    props: FieldProps & {
        value?: boolean | 'indeterminate';
        defaultChecked?: boolean;
        onChange?: (value: boolean) => void;
    }
) {
    // Keep caller-owned mixed state distinct from an unchecked answer.
    const { ref, value, onChange } = useValue<boolean | 'indeterminate'>(
        props.value,
        props.defaultChecked ?? false,
        (value) => props.onChange?.(value === true)
    );

    const id = useId();
    const labelId = `${id}-label`;
    const descriptionId = `${id}-description`;
    const input = useRef<HTMLInputElement>(null);

    // A native button retains disabled-fieldset inheritance while Base UI owns checkbox semantics.
    return (
        <Field ref={ref} orientation="horizontal" data-disabled={props.disabled || undefined}>
            <Checkbox
                className="aria-disabled:opacity-50"
                render={<button type="button" />}
                nativeButton
                id={id}
                name={props.disabled ? undefined : props.name}
                checked={value === true}
                indeterminate={value === 'indeterminate'}
                inputRef={input}
                onCheckedChange={(checked) => {
                    // Native activation clears mixed state even when a controlled caller declines the edit.
                    if (input.current) input.current.indeterminate = value === 'indeterminate';
                    onChange(checked);
                }}
                required={props.required && !props.disabled}
                readOnly={props.disabled}
                aria-disabled={props.disabled || undefined}
                aria-labelledby={labelId}
                aria-describedby={props.description ? descriptionId : undefined}
            />
            <FieldLabel htmlFor={id} className="flex-col items-start gap-0.5">
                <span id={labelId}>
                    {props.label}
                    {props.required && (
                        <span className="font-normal text-muted-foreground">
                            <span aria-hidden="true"> · </span>Required
                        </span>
                    )}
                </span>
                {props.description && (
                    <span id={descriptionId} className="font-normal text-muted-foreground">
                        {props.description}
                    </span>
                )}
            </FieldLabel>
        </Field>
    );
}
