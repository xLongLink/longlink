import { useId } from 'react';
import * as fields from './fields';
import { FieldFrame } from './field';
import { FieldLabel } from '@/components/shadcn/field';
import * as radio from '@/components/shadcn/radio-group';
import type { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';

/** Builds a named radio group from string options with independent option labels. */
export function RadioGroup({
    options,
    label,
    description,
    error,
    ref,
    ...props
}: fields.FieldProps &
    Omit<RadioGroupPrimitive.Props<string>, 'children' | 'className' | 'style' | 'render' | 'ref' | 'inputRef'> & {
        options: readonly fields.FormOption[];
        ref?: RadioGroupPrimitive.Props<string>['inputRef'];
    }) {
    const field = fields.useField({ ...props, label, description, error });
    const optionId = useId();

    return (
        <FieldFrame
            id={field.id}
            label={label}
            description={description}
            error={error}
            disabled={props.disabled}
            form={props.form}
            group
        >
            <radio.RadioGroup
                {...props}
                {...field}
                inputRef={ref}
                className={undefined}
                style={undefined}
                render={undefined}
            >
                {options.map((option, index) => (
                    <FieldLabel key={option.value} htmlFor={`${optionId}-${index}`}>
                        <radio.RadioGroupItem
                            id={`${optionId}-${index}`}
                            value={option.value}
                            disabled={option.disabled}
                            aria-invalid={field['aria-invalid']}
                        />
                        {option.label}
                    </FieldLabel>
                ))}
            </radio.RadioGroup>
        </FieldFrame>
    );
}
