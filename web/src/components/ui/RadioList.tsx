import { useValue } from './value';
import type { FieldProps } from './types';
import { Radio } from '@base-ui/react/radio';
import { useId, type ReactNode } from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';

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
        <div ref={ref} className="view-radio-field" data-disabled={props.disabled || undefined}>
            <div className="view-text-field-heading">
                <span id={`${id}-label`} className="view-text-field-label">
                    {props.label}
                    {props.required && (
                        <span className="view-text-field-description">
                            <span aria-hidden="true"> · </span>Required
                        </span>
                    )}
                </span>
                {props.description && (
                    <span id={`${id}-description`} className="view-text-field-description">
                        {props.description}
                    </span>
                )}
            </div>
            <RadioGroup
                className="view-radio-group"
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
        </div>
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
        <div className="view-radio-item" data-disabled={props.isDisabled || undefined}>
            <Radio.Root
                id={id}
                className="view-radio"
                render={<button type="button" />}
                nativeButton
                value={props.value}
                disabled={props.isDisabled}
                aria-labelledby={`${id}-label`}
                aria-describedby={props.description ? `${id}-description` : undefined}
            >
                <Radio.Indicator className="view-radio-dot" aria-hidden="true" />
            </Radio.Root>
            <label htmlFor={id} className="view-text-field-heading">
                <span id={`${id}-label`} className="view-radio-label">
                    {props.label}
                </span>
                {props.description && (
                    <span id={`${id}-description`} className="view-radio-description">
                        {props.description}
                    </span>
                )}
            </label>
        </div>
    );
}
