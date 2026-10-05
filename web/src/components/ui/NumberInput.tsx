import type { FieldProps } from './types';
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
    return <AstryxNumberInput {...props} isWheelEnabled={false} />;
}
