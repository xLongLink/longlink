import { useValue } from './value';
import type { FieldProps } from './types';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

/** Edits a boolean or indeterminate field. */
export function CheckboxInput(
    props: FieldProps & {
        value?: boolean | 'indeterminate';
        checked?: boolean;
        defaultChecked?: boolean;
        onChange?: (value: boolean) => void;
        isReadOnly?: boolean;
        htmlName?: string;
        size?: 'sm' | 'md';
    }
) {
    // Astryx's underlying checkbox retains omission semantics and native validation.
    const { defaultChecked, checked, ...control } = props;
    const field = useValue<boolean | 'indeterminate', HTMLInputElement>(
        checked ?? props.value,
        defaultChecked ?? false,
        (value) => props.onChange?.(value === true)
    );

    // Keep the field visible, enabled, and editable unless explicitly configured otherwise.
    return (
        <AstryxCheckboxInput
            {...control}
            {...field}
            htmlName={props.name ?? props.htmlName}
            size={props.size ?? 'md'}
            isReadOnly={props.readOnly ?? props.isReadOnly ?? false}
            isLabelHidden={false}
            isRequired={props.required ?? props.isRequired ?? false}
            isDisabled={props.disabled ?? props.isDisabled ?? false}
            changeAction={undefined}
            isLoading={false}
        />
    );
}
