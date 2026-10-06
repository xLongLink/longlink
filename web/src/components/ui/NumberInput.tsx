import type { FieldProps } from './types';
import { useSize } from '@astryxdesign/core/SizeContext';
import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';

type NumberInputProps = FieldProps & {
    value: number | null | undefined;
    min?: number | null;
    max?: number | null;
    step?: number | null;
    placeholder?: string;
    size?: 'sm' | 'md' | 'lg';
    isReadOnly?: boolean;
    units?: string | null;
    isIntegerOnly?: boolean;
    htmlName?: string;
    autoComplete?: string;
} & (
        | { hasClear?: false; onChange: (value: number) => void }
        | { hasClear: true; onChange: (value: number | null) => void }
    );

/** Edits a constrained number without wheel editing or custom value formatting. */
export function NumberInput(props: NumberInputProps) {
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Keep number editing unconstrained unless bounds or integer-only behavior are requested.
    return (
        <AstryxNumberInput
            {...props}
            size={size}
            step={props.step === undefined ? 1 : props.step}
            isReadOnly={props.isReadOnly ?? false}
            isIntegerOnly={props.isIntegerOnly ?? false}
            isLabelHidden={false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            isWheelEnabled={false}
        />
    );
}
