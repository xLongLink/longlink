import { useId } from 'react';
import { useValue } from './value';
import { FieldLabel } from './FieldLabel';
import type { FieldProps } from './types';
import { Switch as BaseSwitch } from '@base-ui/react/switch';

/** Edits an on/off setting using one controlled change handler. */
export function Switch(
    props: FieldProps & {
        value?: boolean;
        defaultChecked?: boolean;
        onChange?: (value: boolean) => void;
    }
) {
    // Keep optional local state attached to the real ancestor form for reset.
    const { ref, value, onChange } = useValue(props.value, props.defaultChecked ?? false, props.onChange);
    const id = useId();
    const labelId = `${id}-label`;
    const descriptionId = `${id}-description`;

    // Disabled controls remain discoverable without contributing a value or blocking submission.
    return (
        <div ref={ref} className="view-boolean-field" data-disabled={props.disabled || undefined}>
            <BaseSwitch.Root
                className="view-switch"
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
            >
                <BaseSwitch.Thumb className="view-switch-thumb" />
            </BaseSwitch.Root>
            <FieldLabel controlId={id} label={props.label} description={props.description} required={props.required} />
        </div>
    );
}
