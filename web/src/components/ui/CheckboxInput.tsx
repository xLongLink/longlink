import { useValue } from './value';
import { useId, useRef } from 'react';
import { FieldLabel } from './FieldLabel';
import type { FieldProps } from './types';
import { Check, Minus } from 'lucide-react';
import { Checkbox } from '@base-ui/react/checkbox';

/** Edits a boolean or indeterminate field. */
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
        <div ref={ref} className="view-boolean-field" data-disabled={props.disabled || undefined}>
            <Checkbox.Root
                className="view-checkbox"
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
            >
                <Checkbox.Indicator className="view-checkbox-indicator" aria-hidden="true">
                    {value === 'indeterminate' ? <Minus /> : <Check />}
                </Checkbox.Indicator>
            </Checkbox.Root>
            <FieldLabel controlId={id} label={props.label} description={props.description} required={props.required} />
        </div>
    );
}
