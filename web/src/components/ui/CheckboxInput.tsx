import type { FieldProps } from './types';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

/** Edits a boolean or indeterminate field. */
export function CheckboxInput(
    props: FieldProps & {
        value: boolean | 'indeterminate';
        onChange?: (value: boolean) => void;
        isReadOnly?: boolean;
        htmlName?: string;
        size?: 'sm' | 'md';
    }
) {
    return <AstryxCheckboxInput {...props} changeAction={undefined} isLoading={false} />;
}
