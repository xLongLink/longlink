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
    // Keep the field visible, enabled, and editable unless explicitly configured otherwise.
    return (
        <AstryxCheckboxInput
            {...props}
            size={props.size ?? 'md'}
            isReadOnly={props.isReadOnly ?? false}
            isLabelHidden={props.isLabelHidden ?? false}
            isRequired={props.isRequired ?? false}
            isDisabled={props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
