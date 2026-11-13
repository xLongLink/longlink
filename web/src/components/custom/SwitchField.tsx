import { useId } from 'react';
import { useValue } from './value';
import { Switch } from '../shadcn/switch';
import type { FieldProps } from './types';
import { Field, FieldLabel } from '@/components/shadcn/field';

/** Custom labeled adapter with resettable values and focusable disabled controls. */
export function SwitchField(
    props: FieldProps & { value?: boolean; defaultChecked?: boolean; onChange?: (value: boolean) => void }
) {
    // Keep optional local state attached to the real ancestor form for reset.
    const { ref, value, onChange } = useValue(props.value, props.defaultChecked ?? false, props.onChange);
    const id = useId();
    const labelId = `${id}-label`;
    const descriptionId = `${id}-description`;

    // Disabled controls remain discoverable without contributing a value or blocking submission.
    return (
        <Field ref={ref} orientation="horizontal" data-disabled={props.disabled || undefined}>
            <Switch
                className="aria-disabled:opacity-50"
                render={<button type="button" />}
                nativeButton
                id={id}
                name={props.disabled ? undefined : props.name}
                checked={value}
                onCheckedChange={onChange}
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
