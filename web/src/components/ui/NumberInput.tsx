import { useValue } from './value';
import { FormField } from './FormField';
import type { FieldProps } from './types';
import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';

type NumberInputProps = FieldProps & {
    value?: number | null;
    defaultValue?: number;
    onChange?: (value: number | null) => void;
    min?: number | null;
    max?: number | null;
    step?: number | null;
    placeholder?: string;
    units?: string | null;
    isIntegerOnly?: boolean;
    autoComplete?: string;
};

/** Edits a constrained number without wheel editing or custom value formatting. */
export function NumberInput(props: NumberInputProps) {
    // Keep optional draft state inside the themed numeric control.
    const { defaultValue, ...control } = props;

    const field = useValue<number | null>(props.value, defaultValue ?? null, props.onChange);

    // Keep number editing unconstrained unless bounds or integer-only behavior are requested.
    return (
        <FormField
            {...props}
            fieldRef={field.ref}
            values={[field.value === null ? '' : String(field.value)]}
            error={
                field.value !== null &&
                (!Number.isFinite(field.value) ||
                    (props.min != null && field.value < props.min) ||
                    (props.max != null && field.value > props.max) ||
                    (props.isIntegerOnly && !Number.isInteger(field.value)))
                    ? 'Enter a number within the allowed range.'
                    : undefined
            }
        >
            <AstryxNumberInput
                {...control}
                width="100%"
                value={field.value}
                onChange={field.onChange}
                hasClear
                size="md"
                htmlName={props.name}
                step={props.step === undefined ? 1 : props.step}
                isReadOnly={false}
                isIntegerOnly={props.isIntegerOnly ?? false}
                isLabelHidden={false}
                isRequired={props.required ?? false}
                isDisabled={props.disabled ?? false}
                isWheelEnabled={false}
            />
        </FormField>
    );
}
